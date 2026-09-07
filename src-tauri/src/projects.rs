use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{
    ipc::{InvokeBody, Request, Response},
    State,
};
use uuid::Uuid;

pub struct ProjectState {
    root: PathBuf,
    lock: Mutex<()>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFile {
    schema_version: u32,
    id: String,
    name: String,
    trashed: bool,
    updated_at: u64,
    revision: u64,
    snapshot: Option<Value>,
}

#[derive(Deserialize)]
pub struct NewProject {
    id: String,
    name: String,
    trashed: bool,
}

fn valid_id(id: &str) -> Result<(), String> {
    if id.is_empty()
        || id.len() > 100
        || !id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
    {
        return Err("无效的项目或素材标识".into());
    }
    Ok(())
}

fn timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn io_error(error: std::io::Error) -> String {
    format!("无法读写项目文件：{error}")
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    use std::io::Write;
    let parent = path.parent().ok_or("无效的存储路径")?;
    std::fs::create_dir_all(parent).map_err(io_error)?;
    let temporary = parent.join(format!(".{}.tmp", Uuid::new_v4()));
    let result = (|| {
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)
            .map_err(io_error)?;
        file.write_all(bytes).map_err(io_error)?;
        file.sync_all().map_err(io_error)?;
        drop(file);
        std::fs::rename(&temporary, path).map_err(io_error)?;
        #[cfg(unix)]
        std::fs::File::open(parent)
            .and_then(|dir| dir.sync_all())
            .map_err(io_error)?;
        Ok(())
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(temporary);
    }
    result
}

impl ProjectState {
    pub fn new(root: PathBuf) -> Result<Self, std::io::Error> {
        std::fs::create_dir_all(&root)?;
        Ok(Self {
            root,
            lock: Mutex::new(()),
        })
    }

    fn directory(&self, id: &str) -> Result<PathBuf, String> {
        valid_id(id)?;
        Ok(self.root.join(id))
    }

    fn load(&self, id: &str) -> Result<ProjectFile, String> {
        let bytes = std::fs::read(self.directory(id)?.join("project.json")).map_err(io_error)?;
        let project: ProjectFile =
            serde_json::from_slice(&bytes).map_err(|_| "项目文件已损坏，未覆盖原文件")?;
        if project.schema_version != 1 {
            return Err("项目文件版本不受支持".into());
        }
        if project.id != id {
            return Err("项目文件标识不匹配".into());
        }
        Ok(project)
    }

    fn write(&self, project: &ProjectFile) -> Result<(), String> {
        let bytes = serde_json::to_vec(project).map_err(|e| e.to_string())?;
        atomic_write(&self.directory(&project.id)?.join("project.json"), &bytes)
    }

    fn create(&self, input: NewProject) -> Result<ProjectFile, String> {
        let path = self.directory(&input.id)?.join("project.json");
        if path.try_exists().map_err(io_error)? {
            return self.load(&input.id);
        }
        let project = ProjectFile {
            schema_version: 1,
            id: input.id,
            name: input.name,
            trashed: input.trashed,
            updated_at: timestamp(),
            revision: 0,
            snapshot: None,
        };
        self.write(&project)?;
        Ok(project)
    }

    fn asset_path(&self, id: &str, key: &str, variant: &str) -> Result<PathBuf, String> {
        valid_id(key)?;
        if variant != "original" && variant != "preview" {
            return Err("无效的素材版本".into());
        }
        Ok(self
            .directory(id)?
            .join("assets")
            .join(format!("{key}-{variant}")))
    }

    fn save(
        &self,
        id: &str,
        snapshot: Value,
        expected_revision: u64,
    ) -> Result<ProjectFile, String> {
        let mut project = self.load(id)?;
        if project.trashed {
            return Err("项目已移入回收站，无法保存".into());
        }
        if project.revision != expected_revision {
            return Err("项目已在其他窗口更新，请保留当前页面并重新打开项目核对".into());
        }
        let records = snapshot
            .pointer("/document/store")
            .and_then(Value::as_object)
            .ok_or("无效的画布快照")?;
        if !snapshot.get("session").is_some_and(Value::is_object) {
            return Err("无效的画布视角".into());
        }
        for record in records.values() {
            if record.get("typeName").and_then(Value::as_str) != Some("asset")
                || record.get("type").and_then(Value::as_str) == Some("bookmark")
            {
                continue;
            }
            let key = record
                .pointer("/props/src")
                .and_then(Value::as_str)
                .ok_or("素材尚未保存，请稍后重试")?;
            let key = key.strip_prefix("asset:").ok_or("素材尚未保存到当前项目")?;
            for variant in ["original", "preview"] {
                if !self.asset_path(id, key, variant)?.is_file() {
                    return Err("素材文件缺失，未覆盖已保存的画布".into());
                }
            }
        }
        project.snapshot = Some(snapshot);
        project.revision += 1;
        project.updated_at = timestamp();
        self.write(&project)?;
        Ok(project)
    }

    fn trash(&self, id: &str, trashed: bool) -> Result<(), String> {
        let mut project = self.load(id)?;
        project.trashed = trashed;
        project.revision += 1;
        self.write(&project)
    }
}

#[tauri::command]
pub async fn list_canvas_projects(
    state: State<'_, ProjectState>,
) -> Result<Vec<ProjectFile>, String> {
    let _lock = state.lock.lock().map_err(|_| "项目存储不可用")?;
    let mut projects = Vec::new();
    for entry in std::fs::read_dir(&state.root).map_err(io_error)? {
        let entry = entry.map_err(io_error)?;
        if !entry.file_type().map_err(io_error)?.is_dir()
            || !entry.path().join("project.json").exists()
        {
            continue;
        }
        let mut project = state.load(&entry.file_name().to_string_lossy())?;
        project.snapshot = None;
        projects.push(project);
    }
    Ok(projects)
}

#[tauri::command]
pub async fn create_canvas_project(
    state: State<'_, ProjectState>,
    project: NewProject,
) -> Result<ProjectFile, String> {
    let _lock = state.lock.lock().map_err(|_| "项目存储不可用")?;
    state.create(project)
}

#[tauri::command]
pub async fn load_canvas_project(
    state: State<'_, ProjectState>,
    id: String,
) -> Result<ProjectFile, String> {
    let _lock = state.lock.lock().map_err(|_| "项目存储不可用")?;
    state.load(&id)
}

#[tauri::command]
pub async fn save_canvas_project(
    state: State<'_, ProjectState>,
    id: String,
    snapshot: Value,
    expected_revision: u64,
) -> Result<ProjectFile, String> {
    let _lock = state.lock.lock().map_err(|_| "项目存储不可用")?;
    state.save(&id, snapshot, expected_revision)
}

#[tauri::command]
pub async fn trash_canvas_project(
    state: State<'_, ProjectState>,
    id: String,
    trashed: bool,
) -> Result<(), String> {
    let _lock = state.lock.lock().map_err(|_| "项目存储不可用")?;
    state.trash(&id, trashed)
}

#[tauri::command]
pub async fn delete_canvas_project(
    state: State<'_, ProjectState>,
    id: String,
) -> Result<(), String> {
    let _lock = state.lock.lock().map_err(|_| "项目存储不可用")?;
    if !state.load(&id)?.trashed {
        return Err("只能永久删除回收站中的项目".into());
    }
    std::fs::remove_dir_all(state.directory(&id)?).map_err(io_error)
}

#[tauri::command]
pub async fn write_canvas_asset(
    state: State<'_, ProjectState>,
    request: Request<'_>,
) -> Result<(), String> {
    let header = |name: &str| {
        request
            .headers()
            .get(name)
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| "素材参数不完整".to_string())
    };
    let id = header("x-project-id")?;
    let key = header("x-asset-key")?;
    let variant = header("x-asset-variant")?;
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("需要二进制素材".into());
    };
    if bytes.is_empty() || bytes.len() > 100 * 1024 * 1024 {
        return Err("素材大小不受支持".into());
    }
    let _lock = state.lock.lock().map_err(|_| "项目存储不可用")?;
    if state.load(id)?.trashed {
        return Err("项目已移入回收站".into());
    }
    atomic_write(&state.asset_path(id, key, variant)?, bytes)
}

#[tauri::command]
pub async fn read_canvas_asset(
    state: State<'_, ProjectState>,
    project_id: String,
    key: String,
    variant: String,
) -> Result<Response, String> {
    let bytes = std::fs::read(state.asset_path(&project_id, &key, &variant)?).map_err(io_error)?;
    Ok(Response::new(bytes))
}

#[tauri::command]
pub async fn discard_canvas_asset(
    state: State<'_, ProjectState>,
    project_id: String,
    key: String,
) -> Result<(), String> {
    let _lock = state.lock.lock().map_err(|_| "项目存储不可用")?;
    let project = state.load(&project_id)?;
    let src = format!("asset:{key}");
    if project
        .snapshot
        .as_ref()
        .and_then(|snapshot| snapshot.pointer("/document/store"))
        .and_then(Value::as_object)
        .is_some_and(|records| {
            records.values().any(|record| {
                record.get("typeName").and_then(Value::as_str) == Some("asset")
                    && record.pointer("/props/src").and_then(Value::as_str) == Some(src.as_str())
            })
        })
    {
        return Err("素材仍被已保存的项目引用".into());
    }
    for variant in ["original", "preview"] {
        match std::fs::remove_file(state.asset_path(&project_id, &key, variant)?) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(io_error(error)),
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    struct Fixture(ProjectState);
    impl Fixture {
        fn new() -> Self {
            Self(
                ProjectState::new(
                    std::env::temp_dir().join(format!("swimmeret-project-test-{}", Uuid::new_v4())),
                )
                .unwrap(),
            )
        }
        fn create(&self, id: &str) {
            self.0
                .create(NewProject {
                    id: id.into(),
                    name: "test".into(),
                    trashed: false,
                })
                .unwrap();
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0.root);
        }
    }
    fn snapshot() -> Value {
        serde_json::json!({"document": {"store": {}}, "session": {"camera": {"x": 42, "y": 9, "z": 2}}})
    }

    #[test]
    fn roundtrip_isolated_projects_and_revision_conflicts() {
        let f = Fixture::new();
        f.create("one");
        f.create("two");
        let saved = f.0.save("one", snapshot(), 0).unwrap();
        assert_eq!(saved.revision, 1);
        assert_eq!(f.0.load("one").unwrap().snapshot, Some(snapshot()));
        assert!(f.0.load("two").unwrap().snapshot.is_none());
        assert!(f.0.save("one", serde_json::json!({}), 0).is_err());
        assert_eq!(f.0.load("one").unwrap().snapshot, Some(snapshot()));
    }

    #[test]
    fn missing_assets_and_corrupt_files_do_not_overwrite_saved_work() {
        let f = Fixture::new();
        f.create("one");
        f.0.save("one", snapshot(), 0).unwrap();
        let missing = serde_json::json!({"document": {"store": {"asset": {"typeName": "asset", "type": "image", "props": {"src": "asset:missing"}}}}, "session": {}});
        assert!(f.0.save("one", missing, 1).is_err());
        assert_eq!(f.0.load("one").unwrap().snapshot, Some(snapshot()));
        let path = f.0.directory("one").unwrap().join("project.json");
        std::fs::write(&path, b"corrupt").unwrap();
        assert!(f
            .0
            .create(NewProject {
                id: "one".into(),
                name: "new".into(),
                trashed: false
            })
            .is_err());
        assert_eq!(std::fs::read(path).unwrap(), b"corrupt");
    }

    #[test]
    fn original_bytes_survive_preview_writes_and_trash_restore() {
        let f = Fixture::new();
        f.create("one");
        let original = f.0.asset_path("one", "asset", "original").unwrap();
        atomic_write(&original, &[0, 255, 1, 42]).unwrap();
        atomic_write(&f.0.asset_path("one", "asset", "preview").unwrap(), &[1, 2]).unwrap();
        f.0.trash("one", true).unwrap();
        assert!(f.0.save("one", snapshot(), 1).is_err());
        f.0.trash("one", false).unwrap();
        assert_eq!(std::fs::read(original).unwrap(), [0, 255, 1, 42]);
        assert!(f.0.save("one", snapshot(), 2).is_ok());
        assert!(f.0.directory("../escape").is_err());
        assert!(f.0.asset_path("one", "../escape", "original").is_err());
        assert!(f.0.asset_path("one", "asset", "../escape").is_err());
    }
}
