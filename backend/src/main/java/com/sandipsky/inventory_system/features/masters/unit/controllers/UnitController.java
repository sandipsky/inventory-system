package com.sandipsky.inventory_system.features.masters.unit.controllers;
import com.sandipsky.inventory_system.features.masters.unit.services.UnitService;
import com.sandipsky.inventory_system.features.masters.unit.dtos.UnitDTO;
import com.sandipsky.inventory_system.features.masters.unit.entities.Unit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import java.util.Map;
import com.sandipsky.inventory_system.common.util.ResponseUtil;
import com.sandipsky.inventory_system.security.RequiresOperation;


@RestController
@RequestMapping("/master/units")
public class UnitController {

    @Autowired
    private UnitService service;

    @GetMapping()
    @RequiresOperation("ViewUnit")
    public Page<UnitDTO> getPaginatedUnitsList(@RequestParam Map<String, String> params) {
        return service.getPaginatedUnitsList(params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewUnit")
    public UnitDTO getUnit(@PathVariable int id) {
        return service.getUnitById(id);
    }

    @PostMapping()
    @RequiresOperation("CreateUnit")
    public ResponseEntity<ApiResponse<Unit>> createUnit(@RequestBody UnitDTO unit) {
        Unit res = service.saveUnit(unit);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Unit Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditUnit")
    public ResponseEntity<ApiResponse<Unit>> updateUnit(@PathVariable int id, @RequestBody UnitDTO unit) {
        Unit res = service.updateUnit(id, unit);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Unit Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeleteUnit")
    public ResponseEntity<ApiResponse<Unit>> deleteUnit(@PathVariable int id) {
        service.deleteUnit(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "Unit Deleted successfully"));
    }
}
