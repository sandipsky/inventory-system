package com.sandipsky.inventory_system.features.role_operations.repositories;
import com.sandipsky.inventory_system.features.role_operations.entities.Role;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO;

public interface RoleRepository extends JpaRepository<Role, Integer>, JpaSpecificationExecutor<Role> {
    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, int id);

    Optional<Role> findByName(String name);

    @Query("""
                SELECT new com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO(r.id, r.name)
                FROM Role r
                WHERE (:isActive IS NULL OR r.isActive = :isActive)
            """)
    List<DropdownDTO> findFilteredDropdown(Boolean isActive);
}
