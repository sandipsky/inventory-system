package com.sandipsky.inventory_system.features.user.repositories;
import com.sandipsky.inventory_system.features.user.entities.User;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO;

public interface UserRepository extends JpaRepository<User, Integer>, JpaSpecificationExecutor<User> {
    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByUsernameAndIdNot(String username, int id);

    boolean existsByEmailAndIdNot(String email, int id);

    Optional<User> findByUsername(String username);

    @Query("""
                SELECT new com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO(u.id, u.username)
                FROM User u
                WHERE (:isActive IS NULL OR u.isActive = :isActive)
            """)
    List<DropdownDTO> findFilteredDropdown(
            Boolean isActive);

    @Query("""
                SELECT COUNT(o) > 0
                FROM User u
                JOIN u.role r
                JOIN r.operations o
                WHERE u.username = :username
                  AND o.name = :operationName
            """)
    boolean existsByUsernameAndOperation(@Param("username") String username,
            @Param("operationName") String operationName);
}
