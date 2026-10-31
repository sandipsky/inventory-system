package com.sandipsky.inventory_system.features.accounting.journal.controllers;
import com.sandipsky.inventory_system.features.accounting.journal.dtos.MasterJournalEntryDTO;
import com.sandipsky.inventory_system.features.accounting.journal.entities.MasterJournalEntry;
import com.sandipsky.inventory_system.features.accounting.journal.services.JournalEntryService;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import com.sandipsky.inventory_system.common.util.ResponseUtil;
import org.springframework.http.ResponseEntity;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/journal")
public class JournalEntryController {

    @Autowired
    private JournalEntryService service;

    @GetMapping()
    @RequiresOperation("ViewJournalEntries")
    public List<MasterJournalEntryDTO> getPaginatedMasterPurchaseEntrysList() {
        return service.getAllJournalReport();
    }

    @PostMapping()
    @RequiresOperation("CreateJournalEntry")
    public ResponseEntity<ApiResponse<MasterJournalEntry>> createMasterJournalEntry(
            @RequestBody MasterJournalEntryDTO masterJournalEntryDTO) {
        MasterJournalEntry res = service.saveMasterJournalEntry(masterJournalEntryDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Journal Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditJournalEntry")
    public ResponseEntity<ApiResponse<MasterJournalEntry>> updateMasterJournalEntry(@PathVariable int id,
            @RequestBody MasterJournalEntryDTO masterJournalEntryDTO) {
        MasterJournalEntry res = service.updateMasterJournalEntry(id, masterJournalEntryDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Journal Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeleteJournalEntry")
    public ResponseEntity<ApiResponse<MasterJournalEntry>> deleteMasterJournalEntry(@PathVariable int id) {
        service.deleteMasterJournalEntry(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "Journal Deleted successfully"));
    }
}
