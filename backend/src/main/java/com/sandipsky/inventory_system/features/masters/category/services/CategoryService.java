package com.sandipsky.inventory_system.features.masters.category.services;
import com.sandipsky.inventory_system.features.masters.category.repositories.CategoryRepository;
import com.sandipsky.inventory_system.features.masters.category.dtos.CategoryDTO;
import com.sandipsky.inventory_system.features.masters.category.entities.Category;

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
public class CategoryService {

    @Autowired
    private CategoryRepository repository;

    private final SpecificationBuilder<Category> specBuilder = new SpecificationBuilder<>();

    public Category saveCategory(CategoryDTO dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Category name cannot be null or blank");
        }
        if (repository.existsByName(dto.getName().trim())) {
            throw new DuplicateResourceException("Category with the same name already exists");
        }
        Category category = new Category();
        mapDtoToEntity(dto, category);
        return repository.save(category);
    }

    public Page<CategoryDTO> getPaginatedCategorysList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<Category> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        return repository.findAll(spec, pageable).map(this::mapToDTO);
    }

    public CategoryDTO getCategoryById(int id) {
        Category existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        return mapToDTO(existing);
    }

    public Category updateCategory(int id, CategoryDTO dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Category name cannot be null or blank");
        }
        Category existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        if (repository.existsByNameAndIdNot(dto.getName().trim(), id)) {
            throw new DuplicateResourceException("Category with the same name already exists");
        }
        mapDtoToEntity(dto, existing);
        return repository.save(existing);
    }

    public void deleteCategory(int id) {
        repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        repository.deleteById(id);
    }

    private CategoryDTO mapToDTO(Category category) {
        CategoryDTO dto = new CategoryDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setActive(category.isActive());
        return dto;
    }

    private void mapDtoToEntity(CategoryDTO dto, Category category) {
        category.setName(dto.getName().trim());
        category.setActive(dto.isActive());
    }
}
