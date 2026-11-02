package com.sandipsky.inventory_system.features.dashboard.dtos;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseVsSalesDTO {
    // daily, weekly or monthly
    private String interval;
    // Oldest first, ending with the period that holds today
    private List<PurchaseSalesPointDTO> points;
}
