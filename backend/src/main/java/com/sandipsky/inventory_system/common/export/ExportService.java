package com.sandipsky.inventory_system.common.export;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.settings.configuration.entities.Configuration;
import com.sandipsky.inventory_system.features.settings.configuration.repositories.ConfigurationRepository;

// Turns tables and documents into Excel or PDF downloads. Every file carries the company's
// letterhead from the settings; its dates follow the `calendar` param (AD or BS), else the
// calendar_type setting.
@Service
public class ExportService {

    public static final String CALENDAR_PARAM = "calendar";

    @Autowired
    private ConfigurationRepository configurationRepository;

    // A list or report, named `<name>-<today>`
    public ResponseEntity<byte[]> table(String format, String name, ExportTable table, Map<String, String> params) {
        ExportFormat type = ExportFormat.of(format);
        ExportContext context = context(params);
        byte[] file = type == ExportFormat.EXCEL ? ExcelFile.table(table, context) : PdfFile.table(table, context);
        return download(type, name + "-" + context.today(), file);
    }

    // One document: Excel lists its lines, PDF prints it. Named by its number
    public ResponseEntity<byte[]> document(String format, PrintDocument document, Map<String, String> params) {
        ExportFormat type = ExportFormat.of(format);
        ExportContext context = context(params);
        byte[] file = type == ExportFormat.EXCEL
                ? ExcelFile.document(document, context)
                : PdfFile.documents(List.of(document), context);
        return download(type, Formats.fileName(Formats.docNo(document.number())), file);
    }

    // Several documents in one PDF, each on its own page, named `<name>-<today>`. `empty` is the
    // message when there are none
    public ResponseEntity<byte[]> documents(String name, List<PrintDocument> documents, String empty,
            Map<String, String> params) {
        if (documents.isEmpty()) {
            throw new ResourceNotFoundException(empty);
        }
        ExportContext context = context(params);
        return download(ExportFormat.PDF, name + "-" + context.today(), PdfFile.documents(documents, context));
    }

    private ExportContext context(Map<String, String> params) {
        Map<String, String> settings = configurationRepository.findAll().stream()
                .filter(setting -> setting.getValue() != null && !setting.getValue().isBlank())
                .collect(Collectors.toMap(Configuration::getName, setting -> setting.getValue().trim()));

        String calendar = params.get(CALENDAR_PARAM);
        if (calendar == null || calendar.isBlank()) {
            calendar = settings.get("calendar_type");
        }

        List<String> lines = new ArrayList<>();
        addIfPresent(lines, settings.get("company_address"));
        addIfPresent(lines, joined(
                labelled("Phone", settings.get("company_contact")),
                labelled("Email", settings.get("company_email"))));
        addIfPresent(lines, labelled(settings.getOrDefault("company_reg_type", "Reg."), settings.get("company_reg")));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return new ExportContext(
                settings.getOrDefault("company_name", "Company"),
                lines,
                "BS".equalsIgnoreCase(calendar),
                auth != null ? auth.getName() : "",
                LocalDateTime.now());
    }

    private static String labelled(String label, String value) {
        return value == null ? null : label + ": " + value;
    }

    private static String joined(String... parts) {
        String line = Arrays.stream(parts).filter(part -> part != null)
                .collect(Collectors.joining("   |   "));
        return line.isEmpty() ? null : line;
    }

    private static void addIfPresent(List<String> lines, String line) {
        if (line != null && !line.isBlank()) {
            lines.add(line);
        }
    }

    private static ResponseEntity<byte[]> download(ExportFormat format, String name, byte[] file) {
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(name + "." + format.extension())
                .build();
        return ResponseEntity.ok()
                .contentType(format.mediaType())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(file);
    }
}
