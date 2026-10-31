package com.sandipsky.inventory_system.features.purchase.vendor.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "vendor")
public class Vendor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String name;

    private String registrationNumber;

    private boolean isActive;

    private String contact;

    private String address;

    private String email;

    private String remarks;
}
