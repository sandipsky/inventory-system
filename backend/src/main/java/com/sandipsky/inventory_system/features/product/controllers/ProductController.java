package com.sandipsky.inventory_system.features.product.controllers;
import com.sandipsky.inventory_system.features.product.dtos.ProductStockDTO;
import com.sandipsky.inventory_system.features.product.services.ProductService;
import com.sandipsky.inventory_system.features.product.dtos.ProductDTO;
import com.sandipsky.inventory_system.features.product.entities.Product;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import java.util.Map;
import com.sandipsky.inventory_system.security.RequiresOperation;
import com.sandipsky.inventory_system.common.util.ResponseUtil;

import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;


@RestController
@RequestMapping("/products")
public class ProductController {

    @Autowired
    private ProductService service;

    @GetMapping()
    @RequiresOperation("ViewProduct")
    public Page<ProductDTO> getPaginatedProductsList(@RequestParam Map<String, String> params) {
        return service.getPaginatedProductsList(params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewProduct")
    public ProductDTO getProduct(@PathVariable int id) {
        return service.getProductById(id);
    }

    @GetMapping("/stockInfo/{id}")
    @RequiresOperation("ViewProduct")
    public ProductStockDTO getProductStockInfo(@PathVariable int id) {
        return service.getProductStockInfoById(id);
    }

    @PostMapping()
    @RequiresOperation("CreateProduct")
    public ResponseEntity<ApiResponse<Product>> createProduct(@RequestBody ProductDTO product) {
        Product res = service.saveProduct(product);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Product Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditProduct")
    public ResponseEntity<ApiResponse<Product>> updateProduct(@PathVariable int id, @RequestBody ProductDTO product) {
        Product res = service.updateProduct(id, product);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Product Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeleteProduct")
    public ResponseEntity<ApiResponse<Product>> deleteProduct(@PathVariable int id) {
        service.deleteProduct(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "Product Deleted successfully"));
    }
}
