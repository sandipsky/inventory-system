package com.sandipsky.inventory_system.features.reports.purchase.services;
import com.sandipsky.inventory_system.features.reports.purchase.dtos.PurchaseByProductReportDTO;
import com.sandipsky.inventory_system.features.reports.purchase.dtos.PurchaseByVendorReportDTO;
import com.sandipsky.inventory_system.features.reports.purchase.dtos.PurchaseReportRowDTO;
import com.sandipsky.inventory_system.features.reports.purchase.repositories.PurchaseReportRepository;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.MasterPurchaseEntry;
import com.sandipsky.inventory_system.common.util.ReportDateUtil;

@Service
public class PurchaseReportService {

    @Autowired
    private PurchaseReportRepository repository;

    public List<PurchaseReportRowDTO> getPurchaseReport(String fromDate, String toDate, String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findPurchaseEntries(fromDate, toDate).stream().map(this::mapToRow).toList();
    }

    public List<PurchaseByVendorReportDTO> getPurchaseByVendor(String fromDate, String toDate, String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findPurchaseByVendor(fromDate, toDate);
    }

    public List<PurchaseByProductReportDTO> getPurchaseByProduct(String fromDate, String toDate, String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findPurchaseByProduct(fromDate, toDate);
    }

    private PurchaseReportRowDTO mapToRow(MasterPurchaseEntry entity) {
        PurchaseReportRowDTO row = new PurchaseReportRowDTO();
        row.setId(entity.getId());
        row.setDate(entity.getDate());
        row.setSystemEntryNo(entity.getSystemEntryNo());
        row.setBillNo(entity.getBillNo());
        if (entity.getVendor() != null) {
            row.setVendorName(entity.getVendor().getName());
        }
        row.setTransactionType(entity.getTransactionType());
        row.setSubTotal(entity.getSubTotal());
        row.setDiscount(entity.getDiscount());
        row.setNonTaxableAmount(entity.getNonTaxableAmount());
        row.setTaxableAmount(entity.getTaxableAmount());
        row.setTotalTax(entity.getTotalTax());
        row.setGrandTotal(entity.getGrandTotal());
        return row;
    }
}
