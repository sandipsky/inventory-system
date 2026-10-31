package com.sandipsky.inventory_system.features.settings.configuration.services;
import com.sandipsky.inventory_system.features.settings.configuration.repositories.ConfigurationRepository;
import com.sandipsky.inventory_system.features.settings.configuration.dtos.ConfigurationDTO;
import com.sandipsky.inventory_system.features.settings.configuration.entities.Configuration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;

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
        existing.setValue(dto.getValue());
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
            existing.setValue(dto.getValue());
            repository.save(existing);
        }
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
