package com.sandipsky.inventory_system.common.export;

import org.springframework.http.MediaType;

import com.sandipsky.inventory_system.common.exception.BadRequestException;

// The file an export endpoint sends: the `{format}` path segment is `excel` or `pdf`
public enum ExportFormat {
    EXCEL("xlsx", MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
    PDF("pdf", MediaType.APPLICATION_PDF);

    private final String extension;
    private final MediaType mediaType;

    ExportFormat(String extension, MediaType mediaType) {
        this.extension = extension;
        this.mediaType = mediaType;
    }

    public String extension() {
        return extension;
    }

    public MediaType mediaType() {
        return mediaType;
    }

    public static ExportFormat of(String value) {
        if ("excel".equalsIgnoreCase(value)) {
            return EXCEL;
        }
        if ("pdf".equalsIgnoreCase(value)) {
            return PDF;
        }
        throw new BadRequestException("Export format must be excel or pdf");
    }
}
