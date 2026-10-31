package com.sandipsky.inventory_system.features.inventory.stock_edit.controllers;
import com.sandipsky.inventory_system.features.inventory.stock_edit.services.StockEditService;
import com.sandipsky.inventory_system.features.inventory.stock_edit.dtos.StockEditDTO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import java.util.Map;
import com.sandipsky.inventory_system.common.util.ResponseUtil;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;

import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/stock-edit")
public class StockEditController {

    @Autowired
    private StockEditService service;

    @GetMapping()
    @RequiresOperation("ViewStockEdit")
    public Page<StockEditDTO> getPaginatedProductStocksList(@RequestParam Map<String, String> params) {
        return service.getPaginatedProductStocksList(params);
    }

    // {batchId} is the batch_id from the product stock info; 0 is the product's default batch
    @GetMapping("/{productId}/{batchId}")
    @RequiresOperation("ViewStockEdit")
    public StockEditDTO getProductStock(@PathVariable int productId, @PathVariable int batchId) {
        return service.getProductStock(productId, batchId);
    }

    @PutMapping("/{productId}/{batchId}")
    @RequiresOperation("EditStockEdit")
    public ResponseEntity<ApiResponse<ProductStock>> updateProductStock(@PathVariable int productId,
            @PathVariable int batchId, @RequestBody StockEditDTO stockEditDTO) {
        ProductStock res = service.updateProductStock(productId, batchId, stockEditDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Stock Updated successfully"));
    }
}
