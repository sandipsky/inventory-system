package com.sandipsky.inventory_system.features.purchase.vendor.services;
import com.sandipsky.inventory_system.features.purchase.vendor.repositories.VendorRepository;
import com.sandipsky.inventory_system.features.purchase.vendor.dtos.VendorDTO;
import com.sandipsky.inventory_system.features.purchase.vendor.entities.Vendor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import java.util.Map;
import com.sandipsky.inventory_system.features.accounting.account.entities.AccountMaster;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.accounting.account.repositories.AccountMasterRepository;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;

import jakarta.transaction.Transactional;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

@Service
public class VendorService {

    @Autowired
    private VendorRepository repository;

    @Autowired
    private AccountMasterRepository accountMasterRepository;

    private final SpecificationBuilder<Vendor> specBuilder = new SpecificationBuilder<>();

    @Transactional
    public Vendor saveVendor(VendorDTO dto) {

        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Vendor name cannot be null or blank");
        }

        Vendor vendor = new Vendor();
        mapDtoToEntity(dto, vendor);

        Vendor savedVendor = repository.save(vendor);

        AccountMaster accountMaster = new AccountMaster();
        accountMaster.setAccountName(savedVendor.getName());
        accountMaster.setVendor(savedVendor);
        accountMaster.setAccountType("Payables");
        AccountMaster parent = accountMasterRepository.findByAccountName("Trader Payable")
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        accountMaster.setParentId(parent.getId());
        accountMaster.setParentAccountName(parent.getAccountName());
        accountMaster.setRemarks("For purchase entry purpose");
        accountMasterRepository.save(accountMaster);

        return savedVendor;
    }

    public Page<VendorDTO> getPaginatedVendorsList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<Vendor> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        Page<Vendor> vendorPage = repository.findAll(spec, pageable);
        return vendorPage.map(this::mapToDTO);
    }

    public VendorDTO getVendorById(int id) {
        Vendor vendor = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));
        return mapToDTO(vendor);
    }

    @Transactional
    public Vendor updateVendor(int id, VendorDTO dto) {
        Vendor existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));

        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Vendor name cannot be null or blank");
        }

        mapDtoToEntity(dto, existing);

        AccountMaster accountMaster = accountMasterRepository.findByVendorId(id)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        accountMaster.setAccountName(existing.getName());
        accountMaster.setAccountType("Payables");
        AccountMaster parent = accountMasterRepository.findByAccountName("Trader Payable")
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        accountMaster.setParentId(parent.getId());
        accountMaster.setParentAccountName(parent.getAccountName());
        accountMaster.setRemarks("For purchase entry purpose");
        accountMasterRepository.save(accountMaster);

        return repository.save(existing);
    }

    public void deleteVendor(int id) {
        repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));
        repository.deleteById(id);
    }

    private VendorDTO mapToDTO(Vendor vendor) {
        VendorDTO dto = new VendorDTO();
        dto.setId(vendor.getId());
        dto.setName(vendor.getName());
        dto.setRegistrationNumber(vendor.getRegistrationNumber());
        dto.setContact(vendor.getContact());
        dto.setEmail(vendor.getEmail());
        dto.setAddress(vendor.getAddress());
        dto.setRemarks(vendor.getRemarks());
        dto.setActive(vendor.isActive());
        return dto;
    }

    private void mapDtoToEntity(VendorDTO dto, Vendor vendor) {
        vendor.setName(dto.getName().trim());
        vendor.setRegistrationNumber(dto.getRegistrationNumber().trim());
        vendor.setContact(dto.getContact().trim());
        vendor.setEmail(dto.getEmail().trim());
        vendor.setAddress(dto.getAddress().trim());
        vendor.setRemarks(dto.getRemarks().trim());
        vendor.setActive(dto.isActive());
    }
}
