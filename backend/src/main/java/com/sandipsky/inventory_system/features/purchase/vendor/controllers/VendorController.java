package com.sandipsky.inventory_system.features.purchase.vendor.controllers;
import com.sandipsky.inventory_system.features.purchase.vendor.entities.Vendor;
import com.sandipsky.inventory_system.features.purchase.vendor.services.VendorService;
import com.sandipsky.inventory_system.features.purchase.vendor.dtos.VendorDTO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import java.util.Map;
import com.sandipsky.inventory_system.security.RequiresOperation;
import com.sandipsky.inventory_system.common.util.ResponseUtil;

import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;


@RestController
@RequestMapping("/vendor")
public class VendorController {

    @Autowired
    private VendorService service;

    @GetMapping()
    @RequiresOperation("ViewVendor")
    public Page<VendorDTO> getPaginatedVendorsList(@RequestParam Map<String, String> params) {
        return service.getPaginatedVendorsList(params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewVendor")
    public VendorDTO getVendor(@PathVariable int id) {
        return service.getVendorById(id);
    }

    @PostMapping()
    @RequiresOperation("CreateVendor")
    public ResponseEntity<ApiResponse<Vendor>> createVendor(@RequestBody VendorDTO vendor) {
        Vendor res = service.saveVendor(vendor);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Vendor Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditVendor")
    public ResponseEntity<ApiResponse<Vendor>> updateVendor(@PathVariable int id, @RequestBody VendorDTO vendor) {
        Vendor res = service.updateVendor(id, vendor);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Vendor Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeleteVendor")
    public ResponseEntity<ApiResponse<Vendor>> deleteVendor(@PathVariable int id) {
        service.deleteVendor(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "Vendor Deleted successfully"));
    }
}
