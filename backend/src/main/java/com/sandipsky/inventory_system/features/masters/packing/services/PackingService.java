package com.sandipsky.inventory_system.features.masters.packing.services;
import com.sandipsky.inventory_system.features.masters.packing.repositories.PackingRepository;
import com.sandipsky.inventory_system.features.masters.packing.dtos.PackingDTO;
import com.sandipsky.inventory_system.features.masters.packing.entities.Packing;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import java.util.Map;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.DuplicateResourceException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;

import java.util.List;

@Service
public class PackingService {

    @Autowired
    private PackingRepository repository;

    private final SpecificationBuilder<Packing> specBuilder = new SpecificationBuilder<>();

    public Packing savePacking(PackingDTO dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Packing name cannot be null or blank");
        }
        if (repository.existsByName(dto.getName().trim())) {
            throw new DuplicateResourceException("Packing with the same name already exists");
        }
        Packing packing = new Packing();
        mapDtoToEntity(dto, packing);
        return repository.save(packing);
    }

    public Page<PackingDTO> getPaginatedPackingsList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<Packing> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        return repository.findAll(spec, pageable).map(this::mapToDTO);
    }

    public PackingDTO getPackingById(int id) {
        Packing existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Packing not found"));
        return mapToDTO(existing);
    }

    public Packing updatePacking(int id, PackingDTO dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Packing name cannot be null or blank");
        }
        Packing existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Packing not found"));

        if (repository.existsByNameAndIdNot(dto.getName().trim(), id)) {
            throw new DuplicateResourceException("Packing with the same name already exists");
        }
        mapDtoToEntity(dto, existing);
        return repository.save(existing);
    }

    public void deletePacking(int id) {
        repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Packing not found"));
        repository.deleteById(id);
    }

    private PackingDTO mapToDTO(Packing packing) {
        PackingDTO dto = new PackingDTO();
        dto.setId(packing.getId());
        dto.setName(packing.getName());
        dto.setActive(packing.isActive());
        return dto;
    }

    private void mapDtoToEntity(PackingDTO dto, Packing packing) {
        packing.setName(dto.getName().trim());
        packing.setActive(dto.isActive());
    }
}
