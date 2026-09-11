use sha2::{Digest, Sha256};

pub(crate) fn sha256_hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

pub(crate) fn log_identifier(value: &str) -> String {
    const MAX_IDENTIFIER_CHARS: usize = 64;
    let mut identifier = value.chars().take(MAX_IDENTIFIER_CHARS).collect::<String>();
    if value.chars().count() > MAX_IDENTIFIER_CHARS {
        identifier.push_str("...");
    }
    identifier
}

pub(crate) fn log_json_value(value: &serde_json::Value) -> String {
    const MAX_LOG_CHARS: usize = 4_096;
    let serialized = value.to_string();
    let mut output = serialized.chars().take(MAX_LOG_CHARS).collect::<String>();
    if serialized.chars().count() > MAX_LOG_CHARS {
        output.push_str("...");
    }
    output
}
