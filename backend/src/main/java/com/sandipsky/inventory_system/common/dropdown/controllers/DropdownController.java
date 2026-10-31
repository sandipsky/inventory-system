package com.sandipsky.inventory_system.common.dropdown.controllers;
import com.sandipsky.inventory_system.common.dropdown.services.DropdownService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO;

import java.util.List;

@RestController
@RequestMapping("/dropdown")
public class DropdownController {

    @Autowired
    private DropdownService service;

    @GetMapping("/products/{serviceType}/{type}/{status}")
    public List<DropdownDTO> getProductsDropdown(
            @PathVariable String serviceType,
            @PathVariable String type,
            @PathVariable String status) {
        return service.getProductsDropdown(serviceType, type, status);
    }

    @GetMapping("/vendor/{status}")
    public List<DropdownDTO> getVendorDropdown(@PathVariable String status) {
        return service.getVendorDropdown(status);
    }

    @GetMapping("/customer/{status}")
    public List<DropdownDTO> getCustomerDropdown(@PathVariable String status) {
        return service.getCustomerDropdown(status);
    }

    @GetMapping("/accountMaster/{type}/{partyType}/{status}")
    public List<DropdownDTO> getAccountMasterDropdown(
            @PathVariable String type,
            @PathVariable String partyType,
            @PathVariable String status) {
        return service.getAccountMasterDropdown(type, partyType, status);
    }

    @GetMapping("/units/{status}")
    public List<DropdownDTO> getUnitsDropdown(@PathVariable String status) {
        return service.getUnitsDropdown(status);
    }

    @GetMapping("/packings/{status}")
    public List<DropdownDTO> getPackingDropdown(@PathVariable String status) {
        return service.getPackingDropdown(status);
    }

    @GetMapping("/taxtypes/{status}")
    public List<DropdownDTO> getTaxTypeDropdown(@PathVariable String status) {
        return service.getTaxTypeDropdown(status);
    }

    @GetMapping("/category/{status}")
    public List<DropdownDTO> getCategorysDropdown(@PathVariable String status) {
        return service.getCategoryDropdown(status);
    }

    @GetMapping("/users/{status}")
    public List<DropdownDTO> getUsersDropdown(@PathVariable String status) {
        return service.getUserDropdown(status);
    }

    @GetMapping("/roles/{status}")
    public List<DropdownDTO> getRolesDropdown(@PathVariable String status) {
        return service.getRoleDropdown(status);
    }
}
