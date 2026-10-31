package com.sandipsky.inventory_system.features.user.controllers;
import com.sandipsky.inventory_system.features.user.services.UserService;
import com.sandipsky.inventory_system.features.user.dtos.UserDTO;
import com.sandipsky.inventory_system.features.user.entities.User;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import java.util.Map;
import com.sandipsky.inventory_system.security.RequiresOperation;
import com.sandipsky.inventory_system.common.util.ResponseUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.*;


@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    private UserService service;

    @GetMapping()
    @RequiresOperation("ViewUser")
    public Page<UserDTO> getPaginatedUsersList(@RequestParam Map<String, String> params) {
        return service.getPaginatedUsersList(params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewUser")
    public UserDTO getUser(@PathVariable int id) {
        return service.getUserById(id);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequiresOperation("CreateUser")
    public ResponseEntity<ApiResponse<User>> createUser(@RequestPart("user") UserDTO user,
            @RequestPart(value = "image", required = false) MultipartFile imageFile) {
        User res = service.saveUser(user, imageFile);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "User created successfully"));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequiresOperation("EditUser")
    public ResponseEntity<ApiResponse<User>> updateUser(@PathVariable int id, @RequestPart("user") UserDTO user,
            @RequestPart(value = "image", required = false) MultipartFile imageFile) {
        User res = service.updateUser(id, user, imageFile);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "User updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeleteUser")
    public ResponseEntity<ApiResponse<User>> deleteUser(@PathVariable int id) {
        service.deleteUser(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "User deleted successfully"));
    }
}
