package com.sandipsky.inventory_system.features.accounting.account.services;
import com.sandipsky.inventory_system.features.accounting.account.entities.AccountType;
import com.sandipsky.inventory_system.features.accounting.account.repositories.AccountTypeRepository;
import com.sandipsky.inventory_system.features.accounting.account.dtos.AccountTypeGroupDTO;
import com.sandipsky.inventory_system.features.accounting.account.repositories.AccountMasterRepository;
import com.sandipsky.inventory_system.features.accounting.account.dtos.AccountMasterDTO;
import com.sandipsky.inventory_system.features.accounting.account.entities.AccountMaster;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO;
import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.DuplicateResourceException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AccountMasterService {

    @Autowired
    private AccountMasterRepository repository;

    @Autowired
    private AccountTypeRepository accountTypeRepository;

    // Types come from a fixed list, and "Payables" must not also match "Other Payables"
    private final SpecificationBuilder<AccountMaster> specBuilder = new SpecificationBuilder<>(Set.of("accountType"));

    public AccountMaster saveAccountMaster(AccountMasterDTO dto) {
        if (repository.existsByAccountCode(dto.getAccountCode())) {
            throw new DuplicateResourceException("Duplicate Account Code");
        }

        if (dto.getAccountName() == null || dto.getAccountName().trim().isEmpty()) {
            throw new BadRequestException("Account Name cannot be null or blank");
        }

        if (dto.getAccountType() == null || dto.getAccountType().trim().isEmpty()) {
            throw new BadRequestException("Account Type cannot be null or blank");
        }

        AccountMaster accountMaster = new AccountMaster();
        mapDtoToEntity(dto, accountMaster);
        accountMaster.setIsSystemGenerated(false);
        return repository.save(accountMaster);
    }

    public Page<AccountMasterDTO> getPaginatedAccountMastersList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<AccountMaster> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        Page<AccountMaster> accountMasterPage = repository.findAll(spec, pageable);
        return accountMasterPage.map(this::mapToDTO);
    }

    public AccountMasterDTO getAccountMasterById(int id) {
        AccountMaster accountMaster = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AccountMaster not found"));
        return mapToDTO(accountMaster);
    }

    public AccountMaster updateAccountMaster(int id, AccountMasterDTO accountMaster) {
        AccountMaster existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AccountMaster not found"));

        if (repository.existsByAccountCodeAndIdNot(accountMaster.getAccountCode(), existing.getId())) {
            throw new DuplicateResourceException("Duplicate Account Code");
        }

        if (accountMaster.getAccountName() == null || accountMaster.getAccountName().trim().isEmpty()) {
            throw new BadRequestException("Account Name cannot be null or blank");
        }

        if (accountMaster.getAccountType() == null || accountMaster.getAccountType().trim().isEmpty()) {
            throw new BadRequestException("Account Type cannot be null or blank");
        }

        mapDtoToEntity(accountMaster, existing);
        return repository.save(existing);
    }

    public List<AccountTypeGroupDTO> getAccountTypes() {
        Map<String, List<String>> grouped = accountTypeRepository.findAll().stream()
                .collect(Collectors.groupingBy(
                        AccountType::getHeading,
                        LinkedHashMap::new,
                        Collectors.mapping(AccountType::getName, Collectors.toList())));
        return grouped.entrySet().stream()
                .map(e -> new AccountTypeGroupDTO(e.getKey(), e.getValue()))
                .toList();
    }

    public List<DropdownDTO> getParentAccount(String accountTypeName) {
        return repository.findDropdownByAccountType(accountTypeName);
    }

    public void deleteAccountMaster(int id) {
        AccountMaster accountMaster = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AccountMaster not found"));
        if (accountMaster.getDeletable() == false) {
            throw new BadRequestException("Selected Account cannot be deleted");
        } else if (accountMaster.getVendor() != null || accountMaster.getCustomer() != null) {
            // Saving the vendor or customer needs this account, so it only goes when they do
            throw new BadRequestException("Selected Account belongs to a vendor or customer; delete them instead");
        } else {
            repository.deleteById(id);
        }
    }

    private AccountMasterDTO mapToDTO(AccountMaster accountMaster) {
        AccountMasterDTO dto = new AccountMasterDTO();
        dto.setId(accountMaster.getId());
        dto.setAccountName(accountMaster.getAccountName());
        dto.setAccountCode(accountMaster.getAccountCode());
        dto.setAccountType(accountMaster.getAccountType());
        dto.setParentId(accountMaster.getParentId());
        dto.setParentAccountName(accountMaster.getParentAccountName());
        dto.setRemarks(accountMaster.getRemarks());
        dto.setIsActive(accountMaster.getIsActive());
        dto.setDeletable(accountMaster.getDeletable());
        dto.setIsSystemGenerated(accountMaster.getIsSystemGenerated());
        return dto;
    }

    private void mapDtoToEntity(AccountMasterDTO dto, AccountMaster accountMaster) {
        accountMaster.setAccountName(dto.getAccountName());
        accountMaster.setAccountCode(dto.getAccountCode());
        accountMaster.setAccountType(dto.getAccountType());
        accountMaster.setParentId(dto.getParentId());
        accountMaster.setParentAccountName(dto.getParentAccountName());
        accountMaster.setRemarks(dto.getRemarks());
        accountMaster.setIsActive(dto.getIsActive());
        accountMaster.setDeletable(dto.getDeletable());
    }
}
