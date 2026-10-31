package com.sandipsky.inventory_system.features.sales.customer.repositories;
import com.sandipsky.inventory_system.features.sales.customer.entities.Customer;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO;

public interface CustomerRepository extends JpaRepository<Customer, Integer>, JpaSpecificationExecutor<Customer> {
    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, int id);

    @Query("""
            SELECT new com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO(c.id, c.name)
            FROM Customer c
            WHERE (:isActive IS NULL OR c.isActive = :isActive)
        """)
    List<DropdownDTO> findFilteredDropdown(Boolean isActive);
}
