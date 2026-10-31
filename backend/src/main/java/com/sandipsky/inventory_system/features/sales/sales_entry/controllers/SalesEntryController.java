package com.sandipsky.inventory_system.features.sales.sales_entry.controllers;
import com.sandipsky.inventory_system.features.sales.sales_entry.services.SalesEntryService;
import com.sandipsky.inventory_system.features.sales.sales_entry.dtos.MasterSalesEntryDTO;
import com.sandipsky.inventory_system.features.sales.sales_entry.entities.MasterSalesEntry;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import java.util.Map;
import com.sandipsky.inventory_system.features.settings.document_numbering.services.DocumentNumberingService;
import com.sandipsky.inventory_system.common.util.ResponseUtil;

import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/sales")
public class SalesEntryController {

    @Autowired
    private SalesEntryService service;

    @Autowired
    private DocumentNumberingService documentNumberingService;

    @GetMapping("/generateNumber")
    @RequiresOperation("CreateSalesEntry")
    public String generateSalesNumber() {
        return documentNumberingService.generateSalesNumber();
    }

    @GetMapping()
    @RequiresOperation("ViewSalesEntries")
    public Page<MasterSalesEntryDTO> getPaginatedMasterSalesEntrysList(@RequestParam Map<String, String> params) {
        return service.getPaginatedMasterSalesEntrysList(params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewSalesEntries")
    public MasterSalesEntryDTO getMasterSalesEntry(@PathVariable int id) {
        return service.getMasterSalesEntryById(id);
    }

    @PostMapping()
    @RequiresOperation("CreateSalesEntry")
    public ResponseEntity<ApiResponse<MasterSalesEntry>> createMasterSalesEntry(@RequestBody MasterSalesEntryDTO masterSalesEntryDTO) {
        MasterSalesEntry res = service.saveMasterSalesEntry(masterSalesEntryDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Sales Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditSalesEntry")
    public ResponseEntity<ApiResponse<MasterSalesEntry>> updateMasterSalesEntry(@PathVariable int id, @RequestBody MasterSalesEntryDTO masterSalesEntryDTO) {
        MasterSalesEntry res = service.updateMasterSalesEntry(id, masterSalesEntryDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Sales Updated successfully"));
    }

    @PostMapping("/{id}")
    @RequiresOperation("CancelSalesEntry")
    public ResponseEntity<ApiResponse<MasterSalesEntry>> cancelMasterSalesEntry(@PathVariable int id, @RequestBody MasterSalesEntryDTO masterSalesEntryDTO) {
        service.cancelMasterSalesEntry(id, masterSalesEntryDTO);
        return ResponseEntity.ok(ResponseUtil.success(id, "Sales Cancelled successfully"));
    }
}
