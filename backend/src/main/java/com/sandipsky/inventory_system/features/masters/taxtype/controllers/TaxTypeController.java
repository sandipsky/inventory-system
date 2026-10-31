package com.sandipsky.inventory_system.features.masters.taxtype.controllers;
import com.sandipsky.inventory_system.features.masters.taxtype.services.TaxTypeService;
import com.sandipsky.inventory_system.features.masters.taxtype.dtos.TaxTypeDTO;
import com.sandipsky.inventory_system.features.masters.taxtype.entities.TaxType;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import java.util.Map;
import com.sandipsky.inventory_system.common.util.ResponseUtil;
import com.sandipsky.inventory_system.security.RequiresOperation;


@RestController
@RequestMapping("/master/taxtypes")
public class TaxTypeController {

    @Autowired
    private TaxTypeService service;

    @GetMapping()
    @RequiresOperation("ViewTaxType")
    public Page<TaxTypeDTO> getPaginatedTaxTypesList(@RequestParam Map<String, String> params) {
        return service.getPaginatedTaxTypesList(params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewTaxType")
    public TaxTypeDTO getTaxType(@PathVariable int id) {
        return service.getTaxTypeById(id);
    }

    @PostMapping()
    @RequiresOperation("CreateTaxType")
    public ResponseEntity<ApiResponse<TaxType>> createTaxType(@RequestBody TaxTypeDTO taxType) {
        TaxType res = service.saveTaxType(taxType);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Tax Type Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditTaxType")
    public ResponseEntity<ApiResponse<TaxType>> updateTaxType(@PathVariable int id,
            @RequestBody TaxTypeDTO taxType) {
        TaxType res = service.updateTaxType(id, taxType);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Tax Type Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeleteTaxType")
    public ResponseEntity<ApiResponse<TaxType>> deleteTaxType(@PathVariable int id) {
        service.deleteTaxType(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "Tax Type Deleted successfully"));
    }
}
