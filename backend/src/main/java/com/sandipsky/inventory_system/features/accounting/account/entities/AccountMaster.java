package com.sandipsky.inventory_system.features.accounting.account.entities;
import com.sandipsky.inventory_system.features.purchase.vendor.entities.Vendor;
import com.sandipsky.inventory_system.features.sales.customer.entities.Customer;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "account_master")
public class AccountMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "account_code", length = 50)
    private String accountCode;

    @Column(name = "account_name", length = 100, nullable = false)
    private String accountName;

    @Column(name = "account_type", length = 100, nullable = false)
    private String accountType;

    @Column(name = "is_active", columnDefinition = "TINYINT(1) DEFAULT 1")
    private Boolean isActive = true;

    @Column(name = "deletable", columnDefinition = "TINYINT(1) DEFAULT 1")
    private Boolean deletable = true;

    @Column(name = "is_system_generated", columnDefinition = "TINYINT(1) DEFAULT 0")
    private Boolean isSystemGenerated = false;

    @Column(name = "parent_account_name", length = 100)
    private String parentAccountName;

    @Column(name = "parent_id")
    private Integer parentId = 0;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;
}
