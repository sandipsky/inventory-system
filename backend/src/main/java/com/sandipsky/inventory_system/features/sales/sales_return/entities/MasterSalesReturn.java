package com.sandipsky.inventory_system.features.sales.sales_return.entities;
import com.sandipsky.inventory_system.features.sales.customer.entities.Customer;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "master_sales_return")
public class MasterSalesReturn {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private int id;

	private String date;

	@Column(columnDefinition = "varchar(25) unique not null")
	private String systemEntryNo;

	private String transactionType;

	@Column(columnDefinition = "double default 0 not null")
	private double subTotal;

	@Column(columnDefinition = "double default 0 not null")
	private double discount;

	@Column(columnDefinition = "double default 0 not null")
	private double nonTaxableAmount;

	@Column(columnDefinition = "double default 0 not null")
	private double taxableAmount;

	@Column(columnDefinition = "double default 0 not null")
	private double totalTax;

	@Column(columnDefinition = "boolean default false")
	private boolean rounded;

	@Column(columnDefinition = "double default 0 not null")
	private double rounding;

	@Column(columnDefinition = "double default 0 not null")
	private double grandTotal;

	private String discountType;

	@Column(columnDefinition = "TEXT")
	private String remarks;

	@JsonIgnore
	@OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
	@JoinColumn(name = "masterSalesReturnId", referencedColumnName = "id")
	private List<SalesReturnEntry> salesReturnEntries;

	@ManyToOne
	@JoinColumn(name = "customer_id")
	private Customer customer;
}
