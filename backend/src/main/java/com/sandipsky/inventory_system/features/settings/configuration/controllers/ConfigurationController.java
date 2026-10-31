package com.sandipsky.inventory_system.features.settings.configuration.controllers;
import com.sandipsky.inventory_system.features.settings.configuration.services.ConfigurationService;
import com.sandipsky.inventory_system.features.settings.configuration.dtos.ConfigurationDTO;
import com.sandipsky.inventory_system.features.settings.configuration.entities.Configuration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import com.sandipsky.inventory_system.common.util.ResponseUtil;

import java.util.List;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/configurations")
public class ConfigurationController {

    @Autowired
    private ConfigurationService service;

    @GetMapping()
    public List<ConfigurationDTO> getConfigurations() {
        return service.getConfigurations();
    }

    @PutMapping("/edit")
    @RequiresOperation("EditConfiguration")
    public ResponseEntity<ApiResponse<Configuration>> bulkUpdate(@RequestBody List<ConfigurationDTO> configurations) {
        service.bulkUpdate(configurations);
        return ResponseEntity.ok(ResponseUtil.success(0, "Configurations updated successfully"));
    }

    @PutMapping("/edit/{id}")
    @RequiresOperation("EditConfiguration")
    public ResponseEntity<ApiResponse<Configuration>> updateConfiguration(@PathVariable int id,
            @RequestBody ConfigurationDTO dto) {
        Configuration res = service.updateConfiguration(id, dto);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Configuration updated successfully"));
    }
}
