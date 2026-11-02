package com.sandipsky.inventory_system.features.inventory.stock_edit.services;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.common.export.ExportTable;
import com.sandipsky.inventory_system.common.export.Formats;
import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import com.sandipsky.inventory_system.features.inventory.stock_edit.dtos.StockEditDTO;

// The stock edit list as a file: every product batch with its current stock and prices
@Service
public class StockEditExportService {

    @Autowired
    private StockEditService service;

    // Every batch the list's filters match, in its sort
    public ExportTable list(Map<String, String> params) {
        return ExportTable.<StockEditDTO>of("Stock")
                .text("Product", StockEditDTO::getProductName)
                .text("Batch", row -> Formats.batch(row.getBatchNo()))
                .date("Expiry Date", StockEditDTO::getExpiryDate)
                .number("In Stock", StockEditDTO::getQuantity)
                .amount("Cost Price", StockEditDTO::getCostPrice)
                .amount("Selling Price", StockEditDTO::getSellingPrice)
                .amount("MRP", StockEditDTO::getMrp)
                .build(service.getPaginatedProductStocksList(QueryParamUtil.allRows(params)).getContent());
    }
}
