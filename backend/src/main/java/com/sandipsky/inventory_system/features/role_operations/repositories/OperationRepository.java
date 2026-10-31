package com.sandipsky.inventory_system.features.role_operations.repositories;
import com.sandipsky.inventory_system.features.role_operations.entities.Operation;

import org.springframework.data.jpa.repository.JpaRepository;


public interface OperationRepository extends JpaRepository<Operation, Integer> {
    boolean existsByName(String name);
}
