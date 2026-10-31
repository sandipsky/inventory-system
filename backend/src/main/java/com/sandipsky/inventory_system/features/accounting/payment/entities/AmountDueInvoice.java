package com.sandipsky.inventory_system.features.accounting.payment.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "amount_due_invoice")
public class AmountDueInvoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

	@Column(unique = true)
    private String invoiceNumber;

    @Column(columnDefinition = "double not null default 0")
    private double totalInvoiceAmount;

    @Column(columnDefinition = "double not null default 0")
    private double dueAmount;

    @Column(columnDefinition = "double not null default 0")
    private double paidAmount;
}