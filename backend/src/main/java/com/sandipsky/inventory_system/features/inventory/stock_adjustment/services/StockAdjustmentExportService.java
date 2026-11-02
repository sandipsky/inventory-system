package com.sandipsky.inventory_system.features.inventory.stock_adjustment.services;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.common.export.DocumentParts;
import com.sandipsky.inventory_system.common.export.ExportTable;
import com.sandipsky.inventory_system.common.export.Field;
import com.sandipsky.inventory_system.common.export.Formats;
import com.sandipsky.inventory_system.common.export.PrintDocument;
import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.dtos.MasterStockAdjustmentDTO;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.entities.MasterStockAdjustment;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.entities.StockAdjustmentEntry;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.repositories.MasterStockAdjustmentRepository;

// Files of stock adjustments: the list as a table and one adjustment with its lines
@Service
public class StockAdjustmentExportService {

    @Autowired
    private StockAdjustmentService service;

    @Autowired
    private MasterStockAdjustmentRepository repository;

    // Every adjustment the list's filters match, in its sort
    public ExportTable list(Map<String, String> params) {
        List<MasterStockAdjustmentDTO> rows = service
                .getPaginatedMasterStockAdjustmentsList(QueryParamUtil.allRows(params)).getContent();
        return ExportTable.<MasterStockAdjustmentDTO>of("Stock Adjustments")
                .period(params.get("fromDate"), params.get("toDate"))
                .text("Adjustment Number", row -> Formats.docNo(row.getSystemEntryNo()))
                .date("Date", MasterStockAdjustmentDTO::getDate)
                .text("Remarks", MasterStockAdjustmentDTO::getRemarks)
                .build(rows);
    }

    @Transactional(readOnly = true)
    public PrintDocument document(int id) {
        MasterStockAdjustment adjustment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock Adjustment with Given Id not found"));
        ExportTable lines = ExportTable.<StockAdjustmentEntry>of("Lines")
                .text("Product", line -> line.getProduct().getName())
                .text("Code", line -> line.getProduct().getCode())
                .text("Unit", line -> line.getProduct().getUnit() == null ? null
                        : line.getProduct().getUnit().getName())
                .text("Batch No.", line -> line.getBatch() == null ? null : line.getBatch().getBatchNo())
                .date("Expiry Date", line -> line.getBatch() == null ? null : line.getBatch().getExpiryDate())
                .text("Type", line -> "In".equals(line.getAdjustmentType()) ? "Stock In" : "Stock Out")
                .number("Quantity", StockAdjustmentEntry::getQuantity)
                .text("Reason", StockAdjustmentEntry::getReason)
                .build(adjustment.getStockAdjustmentEntries());
        return new PrintDocument(
                "Stock Adjustment",
                adjustment.getSystemEntryNo(),
                null,
                List.of(),
                DocumentParts.present(
                        Field.text("Adjustment No.", Formats.docNo(adjustment.getSystemEntryNo())),
                        Field.date("Date", adjustment.getDate())),
                lines,
                List.of(),
                DocumentParts.present(Field.text("Remarks", adjustment.getRemarks())));
    }
}
