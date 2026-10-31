package com.sandipsky.inventory_system.features.masters.packing.controllers;
import com.sandipsky.inventory_system.features.masters.packing.services.PackingService;
import com.sandipsky.inventory_system.features.masters.packing.dtos.PackingDTO;
import com.sandipsky.inventory_system.features.masters.packing.entities.Packing;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import java.util.Map;
import com.sandipsky.inventory_system.common.util.ResponseUtil;
import com.sandipsky.inventory_system.security.RequiresOperation;


@RestController
@RequestMapping("/master/packings")
public class PackingController {

    @Autowired
    private PackingService service;

    @GetMapping()
    @RequiresOperation("ViewPacking")
    public Page<PackingDTO> getPaginatedPackingsList(@RequestParam Map<String, String> params) {
        return service.getPaginatedPackingsList(params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewPacking")
    public PackingDTO getPacking(@PathVariable int id) {
        return service.getPackingById(id);
    }

    @PostMapping()
    @RequiresOperation("CreatePacking")
    public ResponseEntity<ApiResponse<Packing>> createPacking(@RequestBody PackingDTO packing) {
        Packing res = service.savePacking(packing);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Packing Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditPacking")
    public ResponseEntity<ApiResponse<Packing>> updatePacking(@PathVariable int id,
            @RequestBody PackingDTO packing) {
        Packing res = service.updatePacking(id, packing);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Packing Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeletePacking")
    public ResponseEntity<ApiResponse<Packing>> deletePacking(@PathVariable int id) {
        service.deletePacking(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "Packing Deleted successfully"));
    }
}
