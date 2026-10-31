package com.sandipsky.inventory_system.features.role_operations.services;
import com.sandipsky.inventory_system.features.role_operations.dtos.OperationDTO;
import com.sandipsky.inventory_system.features.role_operations.repositories.RoleRepository;
import com.sandipsky.inventory_system.features.role_operations.dtos.RoleOperationGroupDTO;
import com.sandipsky.inventory_system.features.role_operations.dtos.RoleDTO;
import com.sandipsky.inventory_system.features.role_operations.entities.Role;
import com.sandipsky.inventory_system.features.role_operations.repositories.OperationRepository;
import com.sandipsky.inventory_system.features.role_operations.entities.Operation;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import java.util.Map;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.DuplicateResourceException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;

@Service
public class RoleService {

    @Autowired
    private RoleRepository repository;

    @Autowired
    private OperationRepository operationRepository;

    private final SpecificationBuilder<Role> specBuilder = new SpecificationBuilder<>();

    @Transactional
    public Role saveRole(RoleDTO dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Role name cannot be null or blank");
        }
        if (repository.existsByName(dto.getName().trim())) {
            throw new DuplicateResourceException("Role with the same name already exists");
        }
        Role role = new Role();
        role.setName(dto.getName().trim());
        role.setDescription(dto.getDescription());
        role.setActive(dto.isActive());
        role.setOperations(resolveOperations(dto.getOperationIds()));
        return repository.save(role);
    }

    @Transactional
    public Role updateRole(int id, RoleDTO dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Role name cannot be null or blank");
        }
        Role existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        if (repository.existsByNameAndIdNot(dto.getName().trim(), id)) {
            throw new DuplicateResourceException("Role with the same name already exists");
        }
        existing.setName(dto.getName().trim());
        existing.setDescription(dto.getDescription());
        existing.setActive(dto.isActive());
        existing.getOperations().clear();
        existing.getOperations().addAll(resolveOperations(dto.getOperationIds()));
        return repository.save(existing);
    }

    public void deleteRole(int id) {
        Role role = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        role.getOperations().clear();
        repository.save(role);
        repository.deleteById(id);
    }

    public Page<RoleDTO> getPaginatedRolesList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<Role> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        return repository.findAll(spec, pageable).map(this::mapToDTO);
    }

    public RoleDTO getRoleById(int id) {
        Role role = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        return mapToDTO(role);
    }

    public List<RoleOperationGroupDTO> getAllRoleOperations(int id) {
        Set<Integer> selectedIds = new HashSet<>();
        if (id != 0) {
            Role role = repository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
            for (Operation op : role.getOperations()) {
                selectedIds.add(op.getId());
            }
        }

        List<Operation> allOperations = operationRepository.findAll();

        LinkedHashMap<String, LinkedHashMap<String, List<RoleOperationGroupDTO.OperationSelection>>> grouped = new LinkedHashMap<>();

        for (Operation op : allOperations) {
            grouped
                    .computeIfAbsent(op.getMasterModule(), k -> new LinkedHashMap<>())
                    .computeIfAbsent(op.getModule(), k -> new ArrayList<>())
                    .add(toSelection(op, selectedIds.contains(op.getId())));
        }

        List<RoleOperationGroupDTO> response = new ArrayList<>();
        for (var masterEntry : grouped.entrySet()) {
            RoleOperationGroupDTO group = new RoleOperationGroupDTO();
            group.setMasterModule(masterEntry.getKey());

            List<RoleOperationGroupDTO.ModuleGroup> moduleGroups = new ArrayList<>();
            for (var moduleEntry : masterEntry.getValue().entrySet()) {
                RoleOperationGroupDTO.ModuleGroup mg = new RoleOperationGroupDTO.ModuleGroup();
                mg.setModuleName(moduleEntry.getKey());
                mg.setOperations(moduleEntry.getValue());
                moduleGroups.add(mg);
            }
            group.setModules(moduleGroups);
            response.add(group);
        }
        return response;
    }

    private RoleOperationGroupDTO.OperationSelection toSelection(Operation op, boolean selected) {
        RoleOperationGroupDTO.OperationSelection sel = new RoleOperationGroupDTO.OperationSelection();
        sel.setId(op.getId());
        sel.setName(op.getName());
        sel.setSelected(selected);
        return sel;
    }

    private List<Operation> resolveOperations(List<Integer> ids) {
        List<Operation> ops = new ArrayList<>();
        if (ids == null || ids.isEmpty()) {
            return ops;
        }
        for (Integer opId : ids) {
            Operation op = operationRepository.findById(opId)
                    .orElseThrow(() -> new ResourceNotFoundException("Operation not found: " + opId));
            ops.add(op);
        }
        return ops;
    }

    private RoleDTO mapToDTO(Role role) {
        RoleDTO dto = new RoleDTO();
        dto.setId(role.getId());
        dto.setName(role.getName());
        dto.setDescription(role.getDescription());
        dto.setActive(role.isActive());

        List<OperationDTO> opDtos = new ArrayList<>();
        List<Integer> opIds = new ArrayList<>();
        if (role.getOperations() != null) {
            for (Operation op : role.getOperations()) {
                OperationDTO opDto = new OperationDTO();
                opDto.setId(op.getId());
                opDto.setName(op.getName());
                opDto.setModule(op.getModule());
                opDto.setMasterModule(op.getMasterModule());
                opDtos.add(opDto);
                opIds.add(op.getId());
            }
        }
        dto.setOperations(opDtos);
        dto.setOperationIds(opIds);
        return dto;
    }
}
