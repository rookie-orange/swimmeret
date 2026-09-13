use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
pub enum ImageGenerationSize {
    #[serde(rename = "1K")]
    OneK,
    #[serde(rename = "1.5K")]
    OneAndHalfK,
    #[serde(rename = "2K")]
    TwoK,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateImageRequest {
    pub(crate) prompt: String,
    pub(crate) size: ImageGenerationSize,
    #[serde(default)]
    pub(crate) aspect_ratio: ImageGenerationRatio,
}

#[derive(Clone, Copy, Debug, Default, Deserialize)]
pub enum ImageGenerationRatio {
    #[default]
    #[serde(rename = "auto")]
    Auto,
    #[serde(rename = "1:1")]
    Square,
    #[serde(rename = "2:3")]
    Portrait,
    #[serde(rename = "3:2")]
    Landscape,
    #[serde(rename = "3:4")]
    Tall,
    #[serde(rename = "4:3")]
    Wide,
    #[serde(rename = "9:16")]
    Vertical,
    #[serde(rename = "16:9")]
    Widescreen,
}

impl GenerateImageRequest {
    pub(crate) fn output_size(&self) -> String {
        let (label, edge) = match self.size {
            ImageGenerationSize::OneK => ("1K", 1024.0_f64),
            ImageGenerationSize::OneAndHalfK => ("1.5K", 1536.0_f64),
            ImageGenerationSize::TwoK => ("2K", 2048.0_f64),
        };
        let (w, h): (u32, u32) = match self.aspect_ratio {
            ImageGenerationRatio::Auto => return label.to_string(),
            ImageGenerationRatio::Square => (1, 1),
            ImageGenerationRatio::Portrait => (2, 3),
            ImageGenerationRatio::Landscape => (3, 2),
            ImageGenerationRatio::Tall => (3, 4),
            ImageGenerationRatio::Wide => (4, 3),
            ImageGenerationRatio::Vertical => (9, 16),
            ImageGenerationRatio::Widescreen => (16, 9),
        };
        // Ark accepts explicit WIDTHxHEIGHT. Keep the requested aspect ratio
        // exact, with dimensions aligned to 8 pixels and the selected pixel budget.
        let unit = (edge / f64::from(w * h).sqrt() / 8.0).ceil() as u32 * 8;
        format!("{}x{}", w * unit, h * unit)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ratios_produce_explicit_dimensions_at_each_resolution() {
        for (size, edge) in [("1K", 1024_u32), ("1.5K", 1536), ("2K", 2048)] {
            for (ratio, w, h) in [
                ("1:1", 1, 1),
                ("2:3", 2, 3),
                ("3:2", 3, 2),
                ("3:4", 3, 4),
                ("4:3", 4, 3),
                ("9:16", 9, 16),
                ("16:9", 16, 9),
            ] {
                let request: GenerateImageRequest = serde_json::from_value(
                    serde_json::json!({"prompt": "小猫", "size": size, "aspectRatio": ratio}),
                )
                .unwrap();
                let output = request.output_size();
                let (width, height) = output.split_once('x').unwrap();
                let width: u32 = width.parse().unwrap();
                let height: u32 = height.parse().unwrap();
                assert_eq!(width * h, height * w);
                assert_eq!(width % 8, 0);
                assert_eq!(height % 8, 0);
                assert!(width * height >= edge * edge);
                assert!(width * height < edge * edge * 12 / 10);
            }
        }
    }

    #[test]
    fn rejects_unknown_ratios() {
        assert!(serde_json::from_value::<GenerateImageRequest>(
            serde_json::json!({"prompt":"小猫", "size":"2K", "aspectRatio":"100:1"})
        )
        .is_err());
    }
}
