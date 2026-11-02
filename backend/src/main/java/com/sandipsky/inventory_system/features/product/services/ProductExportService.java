package com.sandipsky.inventory_system.features.product.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.common.export.ExportTable;
import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import com.sandipsky.inventory_system.features.product.dtos.ProductDTO;

// The product list as a file
@Service
public class ProductExportService {

    @Autowired
    private ProductService service;

    // Every product the list's filters match, in its sort
    public ExportTable list(Map<String, String> params) {
        return ExportTable.<ProductDTO>of("Products")
                .text("Product Name", ProductDTO::getName)
                .text("Code", ProductDTO::getCode)
                .text("Barcode", ProductDTO::getBarcode)
                .text("Category", ProductDTO::getCategoryName)
                .text("Unit", ProductDTO::getUnitName)
                .text("Packing", ProductDTO::getPackingName)
                .text("Tax Type", ProductDTO::getTaxTypeName)
                .text("Type", ProductExportService::types)
                .amount("Cost Price", ProductDTO::getCostPrice)
                .amount("Selling Price", ProductDTO::getSellingPrice)
                .amount("MRP", ProductDTO::getMrp)
                .number("Min Stock", ProductDTO::getMinStock)
                .number("Max Stock", ProductDTO::getMaxStock)
                .text("Status", row -> row.isActive() ? "Active" : "Inactive")
                .build(service.getPaginatedProductsList(QueryParamUtil.allRows(params)).getContent());
    }

    // As the list shows them: Service / Purchasable / Sellable
    private static String types(ProductDTO product) {
        List<String> types = new ArrayList<>();
        if (product.isServiceItem()) {
            types.add("Service");
        }
        types.addAll(product.getProductTypes());
        return String.join(" / ", types);
    }
}
