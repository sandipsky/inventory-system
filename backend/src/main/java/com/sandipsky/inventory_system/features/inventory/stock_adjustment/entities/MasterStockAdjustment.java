package com.sandipsky.inventory_system.features.inventory.stock_adjustment.entities;

import java.util.List;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "master_stock_adjustment")
public class MasterStockAdjustment {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private int id;

	private String date;

	@Column(columnDefinition = "varchar(25) unique not null")
	private String systemEntryNo;

	@Column(columnDefinition = "TEXT")
	private String remarks;

	@OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
	@JoinColumn(name = "masterStockAdjustmentId", referencedColumnName = "id")
	private List<StockAdjustmentEntry> stockAdjustmentEntries;
}
