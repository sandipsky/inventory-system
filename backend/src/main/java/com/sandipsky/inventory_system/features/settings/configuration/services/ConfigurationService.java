package com.sandipsky.inventory_system.features.settings.configuration.services;
import com.sandipsky.inventory_system.features.settings.configuration.repositories.ConfigurationRepository;
import com.sandipsky.inventory_system.features.settings.configuration.dtos.ConfigurationDTO;
import com.sandipsky.inventory_system.features.settings.configuration.entities.Configuration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.notification.services.LowStockService;

import java.util.List;

@Service
public class ConfigurationService {

    @Autowired
    private ConfigurationRepository repository;

    public List<ConfigurationDTO> getConfigurations() {
        return repository.findAll().stream().map(this::mapToDTO).toList();
    }

    public Configuration updateConfiguration(int id, ConfigurationDTO dto) {
        Configuration existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Configuration not found"));
        if (!existing.isEditable()) {
            throw new BadRequestException("Configuration '" + existing.getName() + "' is not editable");
        }
        existing.setValue(validValue(existing, dto.getValue()));
        return repository.save(existing);
    }

    @Transactional
    public void bulkUpdate(List<ConfigurationDTO> dtos) {
        for (ConfigurationDTO dto : dtos) {
            Configuration existing = resolve(dto);
            if (!existing.isEditable()) {
                throw new BadRequestException(
                        "Configuration '" + existing.getName() + "' is not editable");
            }
            existing.setValue(validValue(existing, dto.getValue()));
            repository.save(existing);
        }
    }

    // The low stock quantity is blank (alerts off) or a number of at least 0
    private String validValue(Configuration setting, String value) {
        if (LowStockService.SETTING.equals(setting.getName()) && value != null && !value.isBlank()
                && LowStockService.threshold(value) == null) {
            throw new BadRequestException(setting.getLabel() + " must be a number of 0 or more, or blank");
        }
        return value;
    }

    private Configuration resolve(ConfigurationDTO dto) {
        if (dto.getId() > 0) {
            return repository.findById(dto.getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Configuration not found: " + dto.getId()));
        }
        if (dto.getName() != null && !dto.getName().isBlank()) {
            return repository.findByName(dto.getName())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Configuration not found: " + dto.getName()));
        }
        throw new ResourceNotFoundException("Configuration id or name is required");
    }

    private ConfigurationDTO mapToDTO(Configuration c) {
        ConfigurationDTO dto = new ConfigurationDTO();
        dto.setId(c.getId());
        dto.setName(c.getName());
        dto.setLabel(c.getLabel());
        dto.setValue(c.getValue());
        dto.setEditable(c.isEditable());
        return dto;
    }
}
