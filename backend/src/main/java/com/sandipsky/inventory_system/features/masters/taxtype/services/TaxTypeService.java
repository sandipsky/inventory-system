package com.sandipsky.inventory_system.features.masters.taxtype.services;
import com.sandipsky.inventory_system.features.masters.taxtype.dtos.TaxTypeDTO;
import com.sandipsky.inventory_system.features.masters.taxtype.repositories.TaxTypeRepository;
import com.sandipsky.inventory_system.features.masters.taxtype.entities.TaxType;

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
public class TaxTypeService {

    @Autowired
    private TaxTypeRepository repository;

    private final SpecificationBuilder<TaxType> specBuilder = new SpecificationBuilder<>();

    public TaxType saveTaxType(TaxTypeDTO dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Tax Type name cannot be null or blank");
        }
        if (repository.existsByName(dto.getName().trim())) {
            throw new DuplicateResourceException("Tax Type with the same name already exists");
        }
        TaxType taxType = new TaxType();
        mapDtoToEntity(dto, taxType);
        return repository.save(taxType);
    }

    public Page<TaxTypeDTO> getPaginatedTaxTypesList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<TaxType> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        return repository.findAll(spec, pageable).map(this::mapToDTO);
    }

    public TaxTypeDTO getTaxTypeById(int id) {
        TaxType existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tax Type not found"));
        return mapToDTO(existing);
    }

    public TaxType updateTaxType(int id, TaxTypeDTO dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Tax Type name cannot be null or blank");
        }
        TaxType existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tax Type not found"));

        if (repository.existsByNameAndIdNot(dto.getName().trim(), id)) {
            throw new DuplicateResourceException("Tax Type with the same name already exists");
        }
        mapDtoToEntity(dto, existing);
        return repository.save(existing);
    }

    public void deleteTaxType(int id) {
        repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Tax Type not found"));
        repository.deleteById(id);
    }

    private TaxTypeDTO mapToDTO(TaxType taxType) {
        TaxTypeDTO dto = new TaxTypeDTO();
        dto.setId(taxType.getId());
        dto.setName(taxType.getName());
        dto.setTaxRate(taxType.getTaxRate());
        dto.setActive(taxType.isActive());
        return dto;
    }

    private void mapDtoToEntity(TaxTypeDTO dto, TaxType taxType) {
        taxType.setName(dto.getName().trim());
        taxType.setTaxRate(dto.getTaxRate());
        taxType.setActive(dto.isActive());
    }
}
