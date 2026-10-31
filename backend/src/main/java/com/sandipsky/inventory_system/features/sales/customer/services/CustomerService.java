package com.sandipsky.inventory_system.features.sales.customer.services;
import com.sandipsky.inventory_system.features.sales.customer.repositories.CustomerRepository;
import com.sandipsky.inventory_system.features.sales.customer.dtos.CustomerDTO;
import com.sandipsky.inventory_system.features.sales.customer.entities.Customer;

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
public class CustomerService {

    @Autowired
    private CustomerRepository repository;

    @Autowired
    private AccountMasterRepository accountMasterRepository;

    private final SpecificationBuilder<Customer> specBuilder = new SpecificationBuilder<>();

    @Transactional
    public Customer saveCustomer(CustomerDTO dto) {

        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Customer name cannot be null or blank");
        }

        Customer customer = new Customer();
        mapDtoToEntity(dto, customer);

        Customer savedCustomer = repository.save(customer);

        AccountMaster accountMaster = new AccountMaster();
        accountMaster.setAccountName(savedCustomer.getName());
        accountMaster.setCustomer(savedCustomer);
        accountMaster.setAccountType("Receivables");
        AccountMaster parent = accountMasterRepository.findByAccountName("Trade Receivables")
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        accountMaster.setParentId(parent.getId());
        accountMaster.setParentAccountName(parent.getAccountName());
        accountMaster.setRemarks("For sales entry purpose");
        accountMasterRepository.save(accountMaster);

        return savedCustomer;
    }

    public Page<CustomerDTO> getPaginatedCustomersList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<Customer> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        Page<Customer> customerPage = repository.findAll(spec, pageable);
        return customerPage.map(this::mapToDTO);
    }

    public CustomerDTO getCustomerById(int id) {
        Customer customer = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        return mapToDTO(customer);
    }

    @Transactional
    public Customer updateCustomer(int id, CustomerDTO dto) {
        Customer existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Customer name cannot be null or blank");
        }

        mapDtoToEntity(dto, existing);

        AccountMaster accountMaster = accountMasterRepository.findByCustomerId(id)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        accountMaster.setAccountName(existing.getName());
        accountMaster.setAccountType("Receivables");
        AccountMaster parent = accountMasterRepository.findByAccountName("Trade Receivables")
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        accountMaster.setParentId(parent.getId());
        accountMaster.setParentAccountName(parent.getAccountName());
        accountMaster.setRemarks("For sales entry purpose");
        accountMasterRepository.save(accountMaster);

        return repository.save(existing);
    }

    public void deleteCustomer(int id) {
        repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        repository.deleteById(id);
    }

    private CustomerDTO mapToDTO(Customer customer) {
        CustomerDTO dto = new CustomerDTO();
        dto.setId(customer.getId());
        dto.setName(customer.getName());
        dto.setRegistrationNumber(customer.getRegistrationNumber());
        dto.setContact(customer.getContact());
        dto.setEmail(customer.getEmail());
        dto.setAddress(customer.getAddress());
        dto.setRemarks(customer.getRemarks());
        dto.setActive(customer.isActive());
        return dto;
    }

    private void mapDtoToEntity(CustomerDTO dto, Customer customer) {
        customer.setName(dto.getName().trim());
        customer.setRegistrationNumber(dto.getRegistrationNumber().trim());
        customer.setContact(dto.getContact().trim());
        customer.setEmail(dto.getEmail().trim());
        customer.setAddress(dto.getAddress().trim());
        customer.setRemarks(dto.getRemarks().trim());
        customer.setActive(dto.isActive());
    }
}
