package com.sandipsky.inventory_system.features.role_operations.controllers;
import com.sandipsky.inventory_system.features.role_operations.services.RoleService;
import com.sandipsky.inventory_system.features.role_operations.dtos.RoleOperationGroupDTO;
import com.sandipsky.inventory_system.features.role_operations.dtos.RoleDTO;
import com.sandipsky.inventory_system.features.role_operations.entities.Role;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import java.util.Map;
import com.sandipsky.inventory_system.security.RequiresOperation;
import com.sandipsky.inventory_system.common.util.ResponseUtil;

@RestController
@RequestMapping("/roles")
public class RoleController {

    @Autowired
    private RoleService service;

    @GetMapping()
    @RequiresOperation("ViewRole")
    public Page<RoleDTO> getPaginatedRolesList(@RequestParam Map<String, String> params) {
        return service.getPaginatedRolesList(params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewRole")
    public RoleDTO getRole(@PathVariable int id) {
        return service.getRoleById(id);
    }

    @GetMapping("/operations/{id}")
    @RequiresOperation("ViewRole")
    public List<RoleOperationGroupDTO> getAllRoleOperations(@PathVariable int id) {
        return service.getAllRoleOperations(id);
    }

    @PostMapping()
    @RequiresOperation("CreateRole")
    public ResponseEntity<ApiResponse<Role>> createRole(@RequestBody RoleDTO role) {
        Role res = service.saveRole(role);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Role Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditRole")
    public ResponseEntity<ApiResponse<Role>> updateRole(@PathVariable int id, @RequestBody RoleDTO role) {
        Role res = service.updateRole(id, role);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Role Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeleteRole")
    public ResponseEntity<ApiResponse<Role>> deleteRole(@PathVariable int id) {
        service.deleteRole(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "Role Deleted successfully"));
    }
}
