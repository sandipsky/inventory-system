package com.sandipsky.inventory_system.features.accounting.account.controllers;
import com.sandipsky.inventory_system.features.accounting.account.dtos.AccountTypeGroupDTO;
import com.sandipsky.inventory_system.features.accounting.account.services.AccountMasterService;
import com.sandipsky.inventory_system.features.accounting.account.dtos.AccountMasterDTO;
import com.sandipsky.inventory_system.features.accounting.account.entities.AccountMaster;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO;
import java.util.Map;
import com.sandipsky.inventory_system.security.RequiresOperation;
import com.sandipsky.inventory_system.common.util.ResponseUtil;

import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;

import java.util.List;

@RestController
@RequestMapping("/accountMaster")
public class AccountMasterController {

    @Autowired
    private AccountMasterService service;

    @GetMapping()
    @RequiresOperation("ViewAccountMaster")
    public Page<AccountMasterDTO> getPaginatedAccountMastersList(@RequestParam Map<String, String> params) {
        return service.getPaginatedAccountMastersList(params);
    }

    @GetMapping("/getAccountTypes")
    @RequiresOperation("ViewAccountMaster")
    public List<AccountTypeGroupDTO> getAccountTypes() {
        return service.getAccountTypes();
    }

    @GetMapping("/getParentAccount/{accountTypeName}")
    @RequiresOperation("ViewAccountMaster")
    public List<DropdownDTO> getParentAccount(@PathVariable String accountTypeName) {
        return service.getParentAccount(accountTypeName);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewAccountMaster")
    public AccountMasterDTO getAccountMaster(@PathVariable int id) {
        return service.getAccountMasterById(id);
    }

    @PostMapping()
    @RequiresOperation("CreateAccountMaster")
    public ResponseEntity<ApiResponse<AccountMaster>> createAccountMaster(@RequestBody AccountMasterDTO accountMaster) {
        AccountMaster res = service.saveAccountMaster(accountMaster);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "AccountMaster Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditAccountMaster")
    public ResponseEntity<ApiResponse<AccountMaster>> updateAccountMaster(@PathVariable int id, @RequestBody AccountMasterDTO accountMaster) {
        AccountMaster res = service.updateAccountMaster(id, accountMaster);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "AccountMaster Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeleteAccountMaster")
    public ResponseEntity<ApiResponse<AccountMaster>> deleteAccountMaster(@PathVariable int id) {
        service.deleteAccountMaster(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "AccountMaster Deleted successfully"));
    }
}
