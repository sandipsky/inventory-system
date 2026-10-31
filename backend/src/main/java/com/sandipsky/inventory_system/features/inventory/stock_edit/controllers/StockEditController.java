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

    @GetMapping("/{productId}")
    @RequiresOperation("ViewStockEdit")
    public StockEditDTO getProductStock(@PathVariable int productId) {
        return service.getProductStockByProductId(productId);
    }

    @PutMapping("/{productId}")
    @RequiresOperation("EditStockEdit")
    public ResponseEntity<ApiResponse<ProductStock>> updateProductStock(@PathVariable int productId,
            @RequestBody StockEditDTO stockEditDTO) {
        ProductStock res = service.updateProductStock(productId, stockEditDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Stock Updated successfully"));
    }
}
