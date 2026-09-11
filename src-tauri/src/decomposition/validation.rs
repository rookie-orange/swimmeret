use super::types::BoundingBox;
use crate::error::CommandError;

pub(crate) const MAX_INPUT_BYTES: usize = 30 * 1024 * 1024;
const MIN_INPUT_PIXELS: u64 = 512 * 512;
const MAX_INPUT_PIXELS: u64 = 6_000 * 6_000;

pub(crate) fn validate_png(
    bytes: &[u8],
    max_bytes: usize,
    validate_api_dimensions: bool,
) -> Result<(u32, u32), CommandError> {
    const PNG_SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";
    if bytes.len() > max_bytes {
        return Err(CommandError::new(
            "invalid_input",
            format!("图片不能超过 {} MiB", max_bytes / 1024 / 1024),
        ));
    }
    if bytes.len() < 24 || &bytes[..8] != PNG_SIGNATURE || &bytes[12..16] != b"IHDR" {
        return Err(CommandError::new(
            "invalid_input",
            "图片不是有效的 PNG 文件",
        ));
    }
    let width = u32::from_be_bytes(bytes[16..20].try_into().expect("PNG width slice"));
    let height = u32::from_be_bytes(bytes[20..24].try_into().expect("PNG height slice"));
    if width == 0 || height == 0 {
        return Err(CommandError::new("invalid_input", "图片尺寸无效"));
    }

    if validate_api_dimensions {
        let pixels = u64::from(width) * u64::from(height);
        let ratio = f64::from(width) / f64::from(height);
        if !(MIN_INPUT_PIXELS..=MAX_INPUT_PIXELS).contains(&pixels)
            || !(1.0 / 16.0..=16.0).contains(&ratio)
        {
            return Err(CommandError::new(
                "invalid_input",
                "图片像素或宽高比不符合 Seedream 图层分离要求",
            ));
        }
    }

    Ok((width, height))
}

pub(crate) fn validate_input_image(
    bytes: &[u8],
    max_bytes: usize,
    validate_api_dimensions: bool,
) -> Result<(u32, u32, &'static str), CommandError> {
    const PNG_SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";

    if bytes.starts_with(PNG_SIGNATURE) {
        let (width, height) = validate_png(bytes, max_bytes, validate_api_dimensions)?;
        return Ok((width, height, "image/png"));
    }

    let (width, height) = validate_jpeg(bytes, max_bytes, validate_api_dimensions)?;
    Ok((width, height, "image/jpeg"))
}

fn validate_jpeg(
    bytes: &[u8],
    max_bytes: usize,
    validate_api_dimensions: bool,
) -> Result<(u32, u32), CommandError> {
    if bytes.len() > max_bytes {
        return Err(CommandError::new(
            "invalid_input",
            format!("图片不能超过 {} MiB", max_bytes / 1024 / 1024),
        ));
    }
    if bytes.len() < 2 || bytes[..2] != [0xff, 0xd8] {
        return Err(CommandError::new(
            "invalid_input",
            "图片必须是有效的 PNG 或 JPEG 文件",
        ));
    }

    let mut offset = 2;
    while offset < bytes.len() {
        while offset < bytes.len() && bytes[offset] == 0xff {
            offset += 1;
        }
        if offset >= bytes.len() {
            break;
        }

        let marker = bytes[offset];
        offset += 1;
        if marker == 0xd9 || marker == 0xda {
            break;
        }
        if (0xd0..=0xd7).contains(&marker) || marker == 0x01 {
            continue;
        }
        if offset + 2 > bytes.len() {
            break;
        }

        let segment_length = usize::from(u16::from_be_bytes([bytes[offset], bytes[offset + 1]]));
        if segment_length < 2 || offset + segment_length > bytes.len() {
            break;
        }

        if is_jpeg_start_of_frame(marker) {
            if segment_length < 7 {
                break;
            }
            let height = u32::from(u16::from_be_bytes([bytes[offset + 3], bytes[offset + 4]]));
            let width = u32::from(u16::from_be_bytes([bytes[offset + 5], bytes[offset + 6]]));
            if width == 0 || height == 0 {
                return Err(CommandError::new("invalid_input", "图片尺寸无效"));
            }
            validate_image_dimensions(width, height, validate_api_dimensions)?;
            return Ok((width, height));
        }

        offset += segment_length;
    }

    Err(CommandError::new(
        "invalid_input",
        "图片必须是有效的 PNG 或 JPEG 文件",
    ))
}

fn is_jpeg_start_of_frame(marker: u8) -> bool {
    matches!(
        marker,
        0xc0..=0xc3 | 0xc5..=0xc7 | 0xc9..=0xcb | 0xcd..=0xcf
    )
}

fn validate_image_dimensions(
    width: u32,
    height: u32,
    validate_api_dimensions: bool,
) -> Result<(), CommandError> {
    if !validate_api_dimensions {
        return Ok(());
    }

    let pixels = u64::from(width) * u64::from(height);
    let ratio = f64::from(width) / f64::from(height);
    if !(MIN_INPUT_PIXELS..=MAX_INPUT_PIXELS).contains(&pixels)
        || !(1.0 / 16.0..=16.0).contains(&ratio)
    {
        return Err(CommandError::new(
            "invalid_input",
            "图片像素或宽高比不符合 Seedream 图层分离要求",
        ));
    }

    Ok(())
}

pub(crate) fn validate_bounding_box(
    z_index: i32,
    bounding_box: Option<&BoundingBox>,
) -> Result<(), CommandError> {
    let Some(bounding_box) = bounding_box else {
        if z_index == 0 {
            return Ok(());
        }
        return Err(CommandError::new(
            "invalid_response",
            "生成图层缺少边界信息",
        ));
    };
    let [left, top, right, bottom] = bounding_box.normalized;
    let [absolute_left, absolute_top, absolute_right, absolute_bottom] = bounding_box.absolute;
    if ![left, top, right, bottom]
        .iter()
        .all(|value| value.is_finite() && (0.0..=1000.0).contains(value))
        || left >= right
        || top >= bottom
    {
        return Err(CommandError::new(
            "invalid_response",
            "生成图层的边界信息无效",
        ));
    }
    if ![absolute_left, absolute_top, absolute_right, absolute_bottom]
        .iter()
        .all(|value| value.is_finite() && (0.0..=24_000.0).contains(value))
        || absolute_left >= absolute_right
        || absolute_top >= absolute_bottom
    {
        return Err(CommandError::new(
            "invalid_response",
            "生成图层的绝对边界信息无效",
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn png_header(width: u32, height: u32) -> Vec<u8> {
        let mut bytes = vec![0_u8; 24];
        bytes[..8].copy_from_slice(b"\x89PNG\r\n\x1a\n");
        bytes[12..16].copy_from_slice(b"IHDR");
        bytes[16..20].copy_from_slice(&width.to_be_bytes());
        bytes[20..24].copy_from_slice(&height.to_be_bytes());
        bytes
    }
    fn jpeg_header(width: u16, height: u16) -> Vec<u8> {
        vec![
            0xff,
            0xd8, // SOI
            0xff,
            0xc0, // SOF0
            0x00,
            0x0b, // segment length
            0x08, // precision
            (height >> 8) as u8,
            height as u8,
            (width >> 8) as u8,
            width as u8,
            0x03,
            0x01,
            0x11,
            0x00,
            0xff,
            0xd9, // EOI
        ]
    }

    #[test]
    fn validates_supported_png_dimensions() {
        assert_eq!(
            validate_png(&png_header(1024, 1024), 1024, true).unwrap(),
            (1024, 1024)
        );
    }

    #[test]
    fn validates_supported_jpeg_dimensions() {
        assert_eq!(
            validate_input_image(&jpeg_header(1024, 1024), 1024, true).unwrap(),
            (1024, 1024, "image/jpeg")
        );
    }

    #[test]
    fn rejects_too_small_png() {
        let error = validate_png(&png_header(128, 128), 1024, true).unwrap_err();
        assert_eq!(error.code, "invalid_input");
    }

    #[test]
    fn validates_bounding_box_coordinate_sets() {
        let valid = BoundingBox {
            absolute: [0.0, 0.0, 1024.0, 1024.0],
            normalized: [0.0, 0.0, 1000.0, 1000.0],
        };
        let invalid_absolute = BoundingBox {
            absolute: [1024.0, 0.0, 0.0, 1024.0],
            normalized: [0.0, 0.0, 1000.0, 1000.0],
        };

        assert!(validate_bounding_box(1, Some(&valid)).is_ok());
        assert!(validate_bounding_box(1, Some(&invalid_absolute)).is_err());
        assert!(validate_bounding_box(1, None).is_err());
        assert!(validate_bounding_box(0, None).is_ok());
    }
}
