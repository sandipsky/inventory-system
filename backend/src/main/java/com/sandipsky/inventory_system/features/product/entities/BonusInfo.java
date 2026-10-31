package com.sandipsky.inventory_system.features.product.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "bonus_info")
public class BonusInfo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private Double minQuantity;

    private Double bonusQuantity;
}
