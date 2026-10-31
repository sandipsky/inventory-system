package com.sandipsky.inventory_system.features.masters.unit.services;
import com.sandipsky.inventory_system.features.masters.unit.repositories.UnitRepository;
import com.sandipsky.inventory_system.features.masters.unit.dtos.UnitDTO;
import com.sandipsky.inventory_system.features.masters.unit.entities.Unit;

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
public class UnitService {

    @Autowired
    private UnitRepository repository;

    private final SpecificationBuilder<Unit> specBuilder = new SpecificationBuilder<>();

    public Unit saveUnit(UnitDTO dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Unit name cannot be null or blank");
        }
        if (repository.existsByName(dto.getName().trim())) {
            throw new DuplicateResourceException("Unit with the same name already exists");
        }
        Unit unit = new Unit();
        mapDtoToEntity(dto, unit);
        return repository.save(unit);
    }

    public Page<UnitDTO> getPaginatedUnitsList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<Unit> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        return repository.findAll(spec, pageable).map(this::mapToDTO);
    }

    public UnitDTO getUnitById(int id) {
        Unit existing = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Unit not found"));
        return mapToDTO(existing);
    }

    public Unit updateUnit(int id, UnitDTO dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Unit name cannot be null or blank");
        }
        Unit existing = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Unit not found"));

        if (repository.existsByNameAndIdNot(dto.getName().trim(), id)) {
            throw new DuplicateResourceException("Unit with the same name already exists");
        }
        mapDtoToEntity(dto, existing);
        return repository.save(existing);
    }

    public void deleteUnit(int id) {
        repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Unit not found"));
        repository.deleteById(id);
    }

    private UnitDTO mapToDTO(Unit unit) {
        UnitDTO dto = new UnitDTO();
        dto.setId(unit.getId());
        dto.setName(unit.getName());
        dto.setActive(unit.isActive());
        return dto;
    }

    private void mapDtoToEntity(UnitDTO dto, Unit unit) {
        unit.setName(dto.getName().trim());
        unit.setActive(dto.isActive());
    }
}
