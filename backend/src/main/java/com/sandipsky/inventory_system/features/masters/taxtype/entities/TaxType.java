package com.sandipsky.inventory_system.features.masters.taxtype.entities;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "tax_type")
public class TaxType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(nullable = false, unique = true)
    private String name;

    @JsonProperty("tax_rate")
    private double taxRate;

    @JsonProperty("is_active")
    private boolean isActive;
}
