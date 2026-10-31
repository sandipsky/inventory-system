package com.sandipsky.inventory_system.features.inventory.stock_adjustment.dtos;

import lombok.Data;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class MasterStockAdjustmentDTO {
    private int id;

    private String date;

    @JsonProperty("system_entry_no")
    private String systemEntryNo;

    private String remarks;

    private List<StockAdjustmentEntryDTO> stockAdjustmentEntries;
}
