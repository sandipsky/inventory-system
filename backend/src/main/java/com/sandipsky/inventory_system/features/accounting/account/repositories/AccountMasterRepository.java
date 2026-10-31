package com.sandipsky.inventory_system.features.accounting.account.repositories;
import com.sandipsky.inventory_system.features.accounting.account.entities.AccountMaster;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO;

public interface AccountMasterRepository
        extends JpaRepository<AccountMaster, Integer>, JpaSpecificationExecutor<AccountMaster> {
    boolean existsByAccountCode(String accountCode);

    boolean existsByAccountCodeAndIdNot(String accountCode, int id);

    Optional<AccountMaster> findByAccountName(String accountName);

    @Query("""
            SELECT new com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO(p.id, p.accountName)
            FROM AccountMaster p
            WHERE (:type IS NULL OR
                   (:type = TRUE AND (p.vendor.id IS NOT NULL OR p.customer.id IS NOT NULL)) OR
                   (:type = FALSE AND p.vendor.id IS NULL AND p.customer.id IS NULL))
              AND (:isActive IS NULL OR p.isActive = :isActive)
              AND (
                  :partyType IS NULL OR
                  (:partyType = 'Vendor' AND p.vendor.id IS NOT NULL) OR
                  (:partyType = 'Customer' AND p.customer.id IS NOT NULL)
              )
            """)
    List<DropdownDTO> findFilteredDropdown(Boolean type,
            String partyType, Boolean isActive);

    @Query("""
                SELECT p
                FROM AccountMaster p
                WHERE p.vendor.id = :vendorId
            """)
    Optional<AccountMaster> findByVendorId(@Param("vendorId") Integer vendorId);

    @Query("""
                SELECT p
                FROM AccountMaster p
                WHERE p.customer.id = :customerId
            """)
    Optional<AccountMaster> findByCustomerId(@Param("customerId") Integer customerId);

    @Query("""
                SELECT new com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO(p.id, p.accountName)
                FROM AccountMaster p
                WHERE p.accountType = :accountType
                  AND p.isActive = TRUE
                  AND p.isSystemGenerated = TRUE
            """)
    List<DropdownDTO> findDropdownByAccountType(@Param("accountType") String accountType);
}
