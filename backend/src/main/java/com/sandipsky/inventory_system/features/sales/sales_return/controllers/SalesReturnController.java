package com.sandipsky.inventory_system.features.sales.sales_return.controllers;
import com.sandipsky.inventory_system.features.sales.sales_return.services.SalesReturnService;
import com.sandipsky.inventory_system.features.sales.sales_return.dtos.MasterSalesReturnDTO;
import com.sandipsky.inventory_system.features.sales.sales_return.entities.MasterSalesReturn;

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
@RequestMapping("/sales-return")
public class SalesReturnController {

    @Autowired
    private SalesReturnService service;

    @Autowired
    private DocumentNumberingService documentNumberingService;

    @GetMapping("/generateNumber")
    @RequiresOperation("CreateSalesReturn")
    public String generateSalesReturnNumber() {
        return documentNumberingService.generateSalesReturnNumber();
    }

    @GetMapping()
    @RequiresOperation("ViewSalesReturns")
    public Page<MasterSalesReturnDTO> getPaginatedMasterSalesReturnsList(@RequestParam Map<String, String> params) {
        return service.getPaginatedMasterSalesReturnsList(params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewSalesReturns")
    public MasterSalesReturnDTO getMasterSalesReturn(@PathVariable int id) {
        return service.getMasterSalesReturnById(id);
    }

    @PostMapping()
    @RequiresOperation("CreateSalesReturn")
    public ResponseEntity<ApiResponse<MasterSalesReturn>> createMasterSalesReturn(
            @RequestBody MasterSalesReturnDTO masterSalesReturnDTO) {
        MasterSalesReturn res = service.saveMasterSalesReturn(masterSalesReturnDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Sales Return Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditSalesReturn")
    public ResponseEntity<ApiResponse<MasterSalesReturn>> updateMasterSalesReturn(@PathVariable int id,
            @RequestBody MasterSalesReturnDTO masterSalesReturnDTO) {
        MasterSalesReturn res = service.updateMasterSalesReturn(id, masterSalesReturnDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Sales Return Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeleteSalesReturn")
    public ResponseEntity<ApiResponse<MasterSalesReturn>> deleteMasterSalesReturn(@PathVariable int id) {
        service.deleteMasterSalesReturn(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "Sales Return Deleted successfully"));
    }
}
