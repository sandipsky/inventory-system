package com.sandipsky.inventory_system.features.masters.category.controllers;
import com.sandipsky.inventory_system.features.masters.category.services.CategoryService;
import com.sandipsky.inventory_system.features.masters.category.dtos.CategoryDTO;
import com.sandipsky.inventory_system.features.masters.category.entities.Category;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import java.util.Map;
import com.sandipsky.inventory_system.common.util.ResponseUtil;
import com.sandipsky.inventory_system.security.RequiresOperation;


@RestController
@RequestMapping("/master/categorys")
public class CategoryController {

    @Autowired
    private CategoryService service;

    @GetMapping()
    @RequiresOperation("ViewCategory")
    public Page<CategoryDTO> getPaginatedCategorysList(@RequestParam Map<String, String> params) {
        return service.getPaginatedCategorysList(params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewCategory")
    public CategoryDTO getCategory(@PathVariable int id) {
        return service.getCategoryById(id);
    }

    @PostMapping()
    @RequiresOperation("CreateCategory")
    public ResponseEntity<ApiResponse<Category>> createCategory(@RequestBody CategoryDTO category) {
        Category res = service.saveCategory(category);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Category Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditCategory")
    public ResponseEntity<ApiResponse<Category>> updateCategory(@PathVariable int id,
            @RequestBody CategoryDTO category) {
        Category res = service.updateCategory(id, category);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Category Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeleteCategory")
    public ResponseEntity<ApiResponse<Category>> deleteCategory(@PathVariable int id) {
        service.deleteCategory(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "Category Deleted successfully"));
    }
}
