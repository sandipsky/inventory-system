package com.sandipsky.inventory_system.features.accounting.account.repositories;
import com.sandipsky.inventory_system.features.accounting.account.entities.AccountType;

import org.springframework.data.jpa.repository.JpaRepository;


public interface AccountTypeRepository extends JpaRepository<AccountType, Integer> {
}
