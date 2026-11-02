package com.sandipsky.inventory_system.features.inventory.opening_stock.services;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.common.export.ExportTable;
import com.sandipsky.inventory_system.common.export.Formats;
import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import com.sandipsky.inventory_system.features.inventory.opening_stock.dtos.OpeningStockDTO;

// The opening stock list as a file: every product batch with its current stock, as the page shows
@Service
public class OpeningStockExportService {

    @Autowired
    private OpeningStockService service;

    // Every batch the list's filters match, in its sort
    public ExportTable list(Map<String, String> params) {
        return ExportTable.<OpeningStockDTO>of("Opening Stock")
                .text("Product", OpeningStockDTO::getProductName)
                .text("Batch", row -> Formats.batch(row.getBatchNo()))
                .date("Expiry Date", OpeningStockDTO::getExpiryDate)
                .number("In Stock", OpeningStockDTO::getQuantity)
                .amount("Cost Price", OpeningStockDTO::getCostPrice)
                .amount("Selling Price", OpeningStockDTO::getSellingPrice)
                .amount("MRP", OpeningStockDTO::getMrp)
                .build(service.getPaginatedOpeningStocksList(QueryParamUtil.allRows(params)).getContent());
    }
}
