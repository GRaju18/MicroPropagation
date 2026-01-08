sap.ui.define([
	"com/9b/MicroPropagation/controller/BaseController",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/9b/MicroPropagation/model/models",
	"sap/ndc/BarcodeScanner",
	"sap/ui/core/format/DateFormat"
], function (BaseController, Fragment, Filter, FilterOperator, model, BarcodeScanner, DateFormat) {
	"use strict";

	return BaseController.extend("com.9b.MicroPropagation.controller.MicroPropagation", {
		formatter: model,

		onInit: function () {
			this.getAppConfigData();
			this.getOwnerComponent().getRouter(this).attachRoutePatternMatched(this._objectMatched, this);
		},
		_objectMatched: function (oEvent) {
			if (oEvent.getParameter("name") === "MicroPropagation") {
				var jsonModel = this.getOwnerComponent().getModel("jsonModel");
				sap.ui.core.BusyIndicator.hide();
				this.getView().byId("microPropagationTable").clearSelection();
				jsonModel.setProperty("/sIconTab", "RECEPTION");
				jsonModel.setProperty("/isSingleSelect", false);
				this.loadLicenseData();
			}
		},
		loadLicenseData: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			jsonModel.setProperty("/licBusy", true);
			var filters = "?$filter=contains(U_NLCTP, 'Cultivator')";
			this.readServiecLayer("/b1s/v2/U_SNBLIC" + filters, function (data) {
				jsonModel.setProperty("/licBusy", false);
				jsonModel.setProperty("/licenseList", data.value);
				jsonModel.setProperty("/sLinObj", data.value[0]);
				that.loadStrainData();
			});
		},
		onChanageLicenseType: function (evt) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sObj = evt.getParameter("selectedItem").getBindingContext("jsonModel").getObject();
			jsonModel.setProperty("/sLinObj", sObj);
			this.loadStrainData();
		},
		onTabChange: function (evt) {
			this.loadMasterData();
		},
		loadStrainData: function () {
			var that = this;
			var licenseNo;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sLicenNo = jsonModel.getProperty("/selectedLicense");
			if (sLicenNo !== undefined) {
				licenseNo = sLicenNo;
			} else if (jsonModel.getProperty("/licenseList").length > 0) {
				licenseNo = jsonModel.getProperty("/licenseList")[0].Code;
			} else {
				licenseNo = "";
			}
			var filters = "?$filter=U_NLFID eq " + "'" + licenseNo + "' and U_NISUD eq 'No'";
			var select = "&$select=U_NPSVG,U_NPKMG,U_NSTNM,DocNum,U_NSTTP";
			this.readServiecLayer("/b1s/v2/NSDN" + filters + select, function (itemData) {
				jsonModel.setProperty("/strainList", itemData.value);
				that.loadMasterData();
			}, this.getView());
		},
		loadMasterData: function () {
			var that = this;
			var licenseNo;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sLicenNo = jsonModel.getProperty("/selectedLicense");
			if (sLicenNo !== undefined) {
				licenseNo = sLicenNo;
			} else if (jsonModel.getProperty("/licenseList").length > 0) {
				licenseNo = jsonModel.getProperty("/licenseList")[0].Code;
			} else {
				licenseNo = "";
			}
			var selTab = this.byId("phenoTab").getSelectedKey();
			var filters;
			if (selTab == "RECEPTION") {
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo + "'  and Quantity ne 0 and U_Phase eq 'Cutting' ";
			} else if (selTab == "PRESERVATION") {
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo + "'  and Quantity ne 0 and U_Phase eq 'MP_Preserve'";
			} else if (selTab == "MULTIPLICATION") {
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo + "'  and Quantity ne 0 and U_Phase eq 'MP_Multiply'";
			} else if (selTab == "STORAGE") {
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo + "'  and Quantity ne 0 and U_Phase eq 'MP_Store'";
			}
			var orderBy = "&$orderby=BatchNum desc";
			this.readServiecLayer("/b1s/v2/sml.svc/CV_PLANNER_VW" + filters + orderBy, function (data) {
				$.grep(data.value, function (plantData) {
					plantData.U_NSTNM = "";
					if (plantData.ItemName) {
						var strainName = plantData.ItemName.split(" - ");
						if (strainName.length > 0) {
							plantData.U_NSTNM = strainName[0];
						}
					}
				});

				//code for display updated date time
				var cDate = new Date();
				var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
					pattern: "KK:mm:ss a"
				});
				var refreshText = dateFormat.format(cDate);
				jsonModel.setProperty("/refreshText", "Last Updated " + refreshText);
				jsonModel.setProperty("/refreshState", "Success");
				jsonModel.setProperty("/microPropagationTableData", data.value);
				this.byId("tableHeader").setText("Plants (" + data.value.length + ")");
				this.byId("tableHeader1").setText("Plants (" + data.value.length + ")");
				this.byId("tableHeader2").setText("Plants (" + data.value.length + ")");
				this.byId("tableHeader3").setText("Plants (" + data.value.length + ")");
			}, this.getView());
		},

		/***method start for Reception***/
		moveCuttings: function () {
			var sItems, that = this;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				if (!this.moveCuttingsDialog) {
					this.moveCuttingsDialog = sap.ui.xmlfragment("moveCuttingsDialog",
						"com.9b.MicroPropagation.view.fragments.MoveCuttingsDialog", this);
					this.getView().addDependent(this.moveCuttingsDialog);
				}
				sap.ui.core.Fragment.byId("moveCuttingsDialog", "growthPhase").setSelectedKey("");
				sap.ui.core.Fragment.byId("moveCuttingsDialog", "mDate").setDateValue(new Date());
				this.moveCuttingsDialog.open();
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		onMoveCuttingsClose: function () {
			this.moveCuttingsDialog.close();
		},
		onMoveCuttings: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var table = this.getView().byId("microPropagationTable");
			var vRoom = sap.ui.core.Fragment.byId("moveCuttingsDialog", "growthPhase").getSelectedKey();
			var createDate = sap.ui.core.Fragment.byId("moveCuttingsDialog", "mDate").getDateValue();
			var dateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var createdDate = dateFormat.format(createDate);
			var that = this;
			var sItems;
			sItems = table.getSelectedIndices();
			var batchUrl = [],
				sObj;

			if (vRoom === "Preservation") {
				var Phase = "MP_Preserve";
				var phaseText = "Preservation";
			} else if (vRoom === "Multiplication") {
				var Phase = "MP_Multiply";
				var phaseText = "Multiplication";
			} else {
				var Phase = "";
				var phaseText = "";
			}
			$.each(sItems, function (i, e) {
				sObj = table.getContextByIndex(e).getObject();
				var payLoadFloInventoryEntry = {
					U_Phase: Phase,
					//U_FlowerDate: changeDate, //"20230115", <Selected Date in format --> YYYYMMDD>
				};
				batchUrl.push({
					url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
					data: payLoadFloInventoryEntry,
					method: "PATCH"
				});
			});
			jsonModel.setProperty("/errorTxt", []);
			this.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Selected plants are moved to " + phaseText);
				}
				that.moveCuttingsDialog.close();
				that.moveCuttingsDialog.setBusy(false);
				that.clearData();
				that.loadStrainData();
				that.byId("microPropagationTable").setSelectedIndex(-1);
			}, this.moveCuttingsDialog);
		},
		/***method end for Reception**/

		/***method start for Preservation***/
		sendToStorage: function () {
			var that = this;
			var jsonModel = that.getOwnerComponent().getModel("jsonModel");
			var sItems;
			var microPropagationTable = this.getView().byId("microPropagationTable");
			sItems = microPropagationTable.getSelectedIndices();
			if (sItems.length > 0) {
				sap.m.MessageBox.confirm("Are you sure you want to move these plants for Storage ?", {
					onClose: function (action) {
						if (action === "OK") {
							var sObj, batchUrl = [];
							$.each(sItems, function (i, e) {
								sObj = microPropagationTable.getContextByIndex(e).getObject();
								var payLoadInventoryEntry = {
									U_Phase: "MP_Store"
								};
								batchUrl.push({
									url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
									data: payLoadInventoryEntry,
									method: "PATCH"
								});
							});
							jsonModel.setProperty("/errorTxt", []);
							that.createBatchCall(batchUrl, function () {
								var errorTxt = jsonModel.getProperty("/errorTxt");
								if (errorTxt.length > 0) {
									sap.m.MessageBox.error(errorTxt.join("\n"));
								} else {
									sap.m.MessageToast.show("Selected plants are moved for storage");
								}
								that.loadStrainData();
								microPropagationTable.setSelectedIndex(-1);
							});
						}
					}
				});
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		/***method end for Preservation***/

		/***methods start for Multiplication tab***/
		//method for send to Preservation
		sendToPreservation: function () {
			var that = this;
			var jsonModel = that.getOwnerComponent().getModel("jsonModel");
			var sItems;
			var microPropagationTable = this.getView().byId("microPropagationTable");
			sItems = microPropagationTable.getSelectedIndices();
			if (sItems.length > 0) {
				sap.m.MessageBox.confirm("Are you sure you want to move these plants for Preservation ?", {
					onClose: function (action) {
						if (action === "OK") {
							var sObj, batchUrl = [];
							$.each(sItems, function (i, e) {
								sObj = microPropagationTable.getContextByIndex(e).getObject();
								var payLoadInventoryEntry = {
									U_Phase: "MP_Preserve"
								};
								batchUrl.push({
									url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
									data: payLoadInventoryEntry,
									method: "PATCH"
								});
							});
							jsonModel.setProperty("/errorTxt", []);
							that.createBatchCall(batchUrl, function () {
								var errorTxt = jsonModel.getProperty("/errorTxt");
								if (errorTxt.length > 0) {
									sap.m.MessageBox.error(errorTxt.join("\n"));
								} else {
									sap.m.MessageToast.show("Selected plants are moved for Preservation");
								}
								that.loadStrainData();
								microPropagationTable.setSelectedIndex(-1);
							});
						}
					}
				});
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},

		//method for create stemvm
		createStemVM: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sItems, that = this;
			var updateObject;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				updateObject = table.getContextByIndex(sItems[0]).getObject();
				if (!this.createStemVMDialog) {
					this.createStemVMDialog = sap.ui.xmlfragment("createStemVMDialog",
						"com.9b.MicroPropagation.view.fragments.CreateStemVM", this);
					this.getView().addDependent(this.createStemVMDialog);
				}
				sap.ui.core.Fragment.byId("createStemVMDialog", "mDate").setDateValue(new Date());
				this.createStemVMDialog.open();
				this.loadInnoculateItems(updateObject);
				this.loadAllData();
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		loadAllData: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var filters1 = "?$filter=U_MetrcLicense eq " + "'" + jsonModel.getProperty("/selectedLicense") + "' and U_Phase ne 'Seed' ";
			var cSelect1 = "&$select=BatchNum,IntrSerial";
			this.readServiecLayer("/b1s/v2/sml.svc/CV_PLANNER_VW" + filters1 + cSelect1, function (data) {
				jsonModel.setProperty("/allData", data.value);
			});
		},
		StemVMClose: function () {
			this.createStemVMDialog.close();
		},
		StemVMCreate: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var table = this.getView().byId("microPropagationTable");
			var vRoom = sap.ui.core.Fragment.byId("createStemVMDialog", "growthPhase").getSelectedKey();
			var createDate = sap.ui.core.Fragment.byId("createStemVMDialog", "mDate").getDateValue();
			var dateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var createdDate = dateFormat.format(createDate);
			var that = this;
			var sItems = table.getSelectedIndices();
			var cultivationData = jsonModel.getProperty("/allData");
			//inventory entry to seedling item
			var InnoculateItemsList = jsonModel.getProperty("/InnoculateItemsList");
			var innoculateItemArray = [],
				invTraDesDataEntry = [],
				batchUrl = [];
			var sObj, payLoadInventory, innoculateItemCode;

			var d = new Date();
			var month = '' + (d.getMonth() + 1);
			var day = '' + d.getDate();
			var year = d.getFullYear();
			var uniqueText = year + "" + month + "" + day;

			//inventory entry to Item
			$.each(sItems, function (i, e) {
				sObj = table.getContextByIndex(e).getObject();
				var itemName = sObj.ItemName;
				var strainName = itemName.split(" - ")[0];
				var strainCode = strainName.split(":")[0];

				var plantID = that.generateClonePlantID(uniqueText, strainCode, cultivationData);
				var batchID = that.generateCloneBatchID(uniqueText, strainCode, cultivationData);

				$.each(InnoculateItemsList, function (i, e2) {
					if (e2.ItemName === strainName + " - " + "Stem VM") {
						innoculateItemArray.push(e2);
					}
				});
				if (innoculateItemArray.length > 0) {
					innoculateItemCode = innoculateItemArray[0].ItemCode;
				}
				payLoadInventory = {
					"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
					"DocDate": createdDate,
					"DocDueDate": createdDate,
					"DocumentLines": [{
						"LineNum": 0,
						"ItemCode": innoculateItemCode,
						"WarehouseCode": sObj.WhsCode,
						"Quantity": 1,
						"BatchNumbers": [{
							"BatchNumber": plantID, //plant ID
							"Quantity": 1,
							"Location": sObj.WhsCode,
							"U_Phase": "MP_Multiply",
							"ManufacturerSerialNumber": sObj.BatchNum, //source
							"InternalSerialNumber": batchID, //batch ID
						}]
					}]
				};
				invTraDesDataEntry.push(payLoadInventory);
			});

			$.grep(invTraDesDataEntry, function (invTransObjEntry) {
				batchUrl.push({
					url: "/b1s/v2/InventoryGenEntries",
					data: invTransObjEntry,
					method: "POST"
				});
			});

			//return;
			jsonModel.setProperty("/errorTxt", []);
			this.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Stem VM created for selected plants");
				}
				that.createStemVMDialog.close();
				that.createStemVMDialog.setBusy(false);
				that.clearData();
				that.loadStrainData();
				that.byId("microPropagationTable").setSelectedIndex(-1);
			}, this.createStemVMDialog);
		},

		//method for Innoculate
		onInnoculate: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sItems, that = this;
			var updateObject;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				updateObject = table.getContextByIndex(sItems[0]).getObject();
				if (updateObject.ItemName.search("Cutting") !== -1) {
					if (!this.InnoculateGrowthPhaseDialog) {
						this.InnoculateGrowthPhaseDialog = sap.ui.xmlfragment("InnoculateGrowthPhaseDialog",
							"com.9b.MicroPropagation.view.fragments.InnoculateGrowthPhase", this);
						this.getView().addDependent(this.InnoculateGrowthPhaseDialog);
					}
					sap.ui.core.Fragment.byId("InnoculateGrowthPhaseDialog", "avalQty").setValue(sItems.length);
					//sap.ui.core.Fragment.byId("InnoculateGrowthPhaseDialog", "location").setSelectedKey("");
					sap.ui.core.Fragment.byId("InnoculateGrowthPhaseDialog", "mDate").setDateValue(new Date());
					this.InnoculateGrowthPhaseDialog.open();
					this.loadInnoculateItems(updateObject);
				} else {
					sap.m.MessageToast.show("You can not change the growth phase of this plant");
					return;
				}
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		loadInnoculateItems: function (updateObject) {
			var cannabisItemArray = [];
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var filters4 = "?$filter=U_NLFID eq " + "'" + jsonModel.getProperty("/selectedLicense") + "' and ItemsGroupCode eq 109";
			var fields4 = "&$select=" + ["ItemName", "ItemsGroupCode", "ItemCode", "U_NLFID"].join();
			this.readServiecLayer("/b1s/v2/Items" + filters4 + fields4, function (data) {
				jsonModel.setProperty("/InnoculateItemsList", data.value);
				var strainName = updateObject.ItemName.split(" - ")[0];
				$.each(data.value, function (i, e2) {
					if (e2.ItemName === strainName + " - " + "Stem VM") {
						cannabisItemArray.push(e2);
					}
				});
				if (cannabisItemArray.length > 0) {
					var cannabisItemCode = cannabisItemArray[0].ItemCode;
				}
				if (this.InnoculateGrowthPhaseDialog) {
					sap.ui.core.Fragment.byId("InnoculateGrowthPhaseDialog", "Item").setSelectedKey(cannabisItemCode);
				}
				if (this.createStemVMDialog) {
					sap.ui.core.Fragment.byId("createStemVMDialog", "Item").setSelectedKey(cannabisItemCode);
				}
			});
		},
		InnoculateClose: function () {
			this.InnoculateGrowthPhaseDialog.close();
		},
		InnoculateGrowthPhase: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var table = this.getView().byId("microPropagationTable");
			var vRoom = sap.ui.core.Fragment.byId("InnoculateGrowthPhaseDialog", "growthPhase").getSelectedKey();
			//var locationID = sap.ui.core.Fragment.byId("InnoculateGrowthPhaseDialog", "location").getSelectedKey();
			var createDate = sap.ui.core.Fragment.byId("InnoculateGrowthPhaseDialog", "mDate").getDateValue();
			var dateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var createdDate = dateFormat.format(createDate);
			// if (locationID === "") {
			// 	sap.m.MessageToast.show("Please select Location");
			// 	return;
			// }
			var that = this;
			var sItems = table.getSelectedIndices();

			//inventory entry to seedling item
			var InnoculateItemsList = jsonModel.getProperty("/InnoculateItemsList");
			var innoculateItemArray = [],
				invTraDesDataEntry = [],
				batchUrl = [];
			var sObj, payLoadInventory, innoculateItemCode, U_Phase;

			var selTab = this.byId("phenoTab").getSelectedKey();
			if (selTab == "RECEPTION") {
				U_Phase = "Cutting";
			} else if (selTab == "PRESERVATION") {
				U_Phase = "MP_Preserve";
			} else if (selTab == "MULTIPLICATION") {
				U_Phase = "MP_Multiply";
			}

			//inventory entry to Item
			$.each(sItems, function (i, e) {
				sObj = table.getContextByIndex(e).getObject();
				var itemName = sObj.ItemName;
				var strainName = itemName.split(" - ")[0];
				$.each(InnoculateItemsList, function (i, e2) {
					if (e2.ItemName === strainName + " - " + "Stem VM") {
						innoculateItemArray.push(e2);
					}
				});
				if (innoculateItemArray.length > 0) {
					innoculateItemCode = innoculateItemArray[0].ItemCode;
				}
				if (invTraDesDataEntry.length > 0) {
					if (sObj.ItemCode === invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[0].ItemCode) {
						invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines.push({
							"LineNum": invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length -
									1].DocumentLines.length -
								1].LineNum + 1,
							"ItemCode": innoculateItemCode,
							"Quantity": 1,
							"WarehouseCode": sObj.WhsCode,
							"BatchNumbers": []
						});
						invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines
								.length - 1].BatchNumbers
							.push({
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode,
								//"U_Phase": "MP_Multiply",
								"U_Phase": U_Phase,
								"ManufacturerSerialNumber": sObj.MnfSerial,
								"InternalSerialNumber": sObj.IntrSerial,
							});
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocDate": createdDate,
							"DocDueDate": createdDate,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": innoculateItemCode,
								"WarehouseCode": sObj.WhsCode,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode,
									"U_Phase": U_Phase,
									"ManufacturerSerialNumber": sObj.MnfSerial,
									"InternalSerialNumber": sObj.IntrSerial,
								}]
							}]
						};
						invTraDesDataEntry.push(payLoadInventory);
					}
				} else {
					payLoadInventory = {
						"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
						"DocDate": createdDate,
						"DocDueDate": createdDate,
						"DocumentLines": [{
							"LineNum": 0,
							"ItemCode": innoculateItemCode,
							"WarehouseCode": sObj.WhsCode,
							"Quantity": 1,
							"BatchNumbers": [{
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode,
								"U_Phase": U_Phase,
								"ManufacturerSerialNumber": sObj.MnfSerial,
								"InternalSerialNumber": sObj.IntrSerial,
							}]
						}]
					};
					invTraDesDataEntry.push(payLoadInventory);
				}
			});
			$.grep(invTraDesDataEntry, function (invTransObjEntry) {
				batchUrl.push({
					url: "/b1s/v2/InventoryGenEntries",
					data: invTransObjEntry,
					method: "POST"
				});
			});

			//inventory exit to selected Item
			var invTraDesData = [];
			$.each(sItems, function (i, e) {
				sObj = table.getContextByIndex(e).getObject();
				if (invTraDesData.length > 0) {
					if (sObj.ItemCode === invTraDesData[invTraDesData.length - 1].DocumentLines[0].ItemCode) {
						invTraDesData[invTraDesData.length - 1].DocumentLines.push({
							"LineNum": invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length -
								1].LineNum + 1,
							"ItemCode": sObj.ItemCode,
							"Quantity": 1,
							"WarehouseCode": sObj.WhsCode,
							"BatchNumbers": []
						});
						invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length - 1].BatchNumbers
							.push({
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode
							});
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": sObj.ItemCode,
								"WarehouseCode": sObj.WhsCode,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode
								}]
							}]
						};
						invTraDesData.push(payLoadInventory);
					}
				} else {
					payLoadInventory = {
						"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
						"DocumentLines": [{
							"LineNum": 0,
							"ItemCode": sObj.ItemCode,
							"WarehouseCode": sObj.WhsCode,
							"Quantity": 1,
							"BatchNumbers": [{
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode
							}]
						}]
					};
					invTraDesData.push(payLoadInventory);
				}
			});

			$.grep(invTraDesData, function (invTransObj) {
				batchUrl.push({
					url: "/b1s/v2/InventoryGenExits",
					data: invTransObj,
					method: "POST"
				});
			});
			//return;
			jsonModel.setProperty("/errorTxt", []);
			this.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Selected plants are moved to Stem VM");
				}
				that.InnoculateGrowthPhaseDialog.close();
				that.InnoculateGrowthPhaseDialog.setBusy(false);
				that.clearData();
				that.loadStrainData();
				that.byId("microPropagationTable").setSelectedIndex(-1);
			}, this.InnoculateGrowthPhaseDialog);
		},

		//method for Record Callus
		onRecordCallus: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sItems, that = this;
			var updateObject;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				updateObject = table.getContextByIndex(sItems[0]).getObject();
				if (updateObject.ItemName.search("Stem VM") !== -1) {
					if (!this.callusGrowthPhaseDialog) {
						this.callusGrowthPhaseDialog = sap.ui.xmlfragment("callusGrowthPhaseDialog",
							"com.9b.MicroPropagation.view.fragments.CallusGrowthPhase", this);
						this.getView().addDependent(this.callusGrowthPhaseDialog);
					}
					sap.ui.core.Fragment.byId("callusGrowthPhaseDialog", "avalQty").setValue(sItems.length);
					//sap.ui.core.Fragment.byId("callusGrowthPhaseDialog", "location").setSelectedKey("");
					sap.ui.core.Fragment.byId("callusGrowthPhaseDialog", "mDate").setDateValue(new Date());
					this.callusGrowthPhaseDialog.open();
					this.loadCallusItems(updateObject);
				} else {
					sap.m.MessageToast.show("You can not change the growth phase of this plant");
					return;
				}
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		loadCallusItems: function (updateObject) {
			var cannabisItemArray = [];
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var filters4 = "?$filter=U_NLFID eq " + "'" + jsonModel.getProperty("/selectedLicense") + "' and ItemsGroupCode eq 109";
			var fields4 = "&$select=" + ["ItemName", "ItemsGroupCode", "ItemCode", "U_NLFID"].join();
			this.readServiecLayer("/b1s/v2/Items" + filters4 + fields4, function (data) {
				jsonModel.setProperty("/CalluseItemsList", data.value);
				var strainName = updateObject.ItemName.split(" - ")[0];
				$.each(data.value, function (i, e2) {
					if (e2.ItemName === strainName + " - " + "Callus") {
						cannabisItemArray.push(e2);
					}
				});
				if (cannabisItemArray.length > 0) {
					var cannabisItemCode = cannabisItemArray[0].ItemCode;
				}
				sap.ui.core.Fragment.byId("callusGrowthPhaseDialog", "Item").setSelectedKey(cannabisItemCode);
			});
		},
		CalluseClose: function () {
			this.callusGrowthPhaseDialog.close();
		},
		CallusGrowthPhase: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var table = this.getView().byId("microPropagationTable");
			var vRoom = sap.ui.core.Fragment.byId("callusGrowthPhaseDialog", "growthPhase").getSelectedKey();
			//var locationID = sap.ui.core.Fragment.byId("callusGrowthPhaseDialog", "location").getSelectedKey();
			var createDate = sap.ui.core.Fragment.byId("callusGrowthPhaseDialog", "mDate").getDateValue();
			var dateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var createdDate = dateFormat.format(createDate);
			// if (locationID === "") {
			// 	sap.m.MessageToast.show("Please select Location");
			// 	return;
			// }
			var that = this;
			var sItems = table.getSelectedIndices();

			//inventory entry to seedling item
			var CalluseItemsList = jsonModel.getProperty("/CalluseItemsList");
			var innoculateItemArray = [],
				invTraDesDataEntry = [],
				batchUrl = [];
			var sObj, payLoadInventory, innoculateItemCode;

			//inventory entry to Item
			$.each(sItems, function (i, e) {
				sObj = table.getContextByIndex(e).getObject();
				var itemName = sObj.ItemName;
				var strainName = itemName.split(" - ")[0];
				$.each(CalluseItemsList, function (i, e2) {
					if (e2.ItemName === strainName + " - " + "Callus") {
						innoculateItemArray.push(e2);
					}
				});
				if (innoculateItemArray.length > 0) {
					innoculateItemCode = innoculateItemArray[0].ItemCode;
				}
				if (invTraDesDataEntry.length > 0) {
					if (sObj.ItemCode === invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[0].ItemCode) {
						invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines.push({
							"LineNum": invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length -
									1].DocumentLines.length -
								1].LineNum + 1,
							"ItemCode": innoculateItemCode,
							"Quantity": 1,
							"WarehouseCode": sObj.WhsCode,
							"BatchNumbers": []
						});
						invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines
								.length - 1].BatchNumbers
							.push({
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode,
								"U_Phase": "MP_Multiply",
								"ManufacturerSerialNumber": sObj.MnfSerial,
								"InternalSerialNumber": sObj.IntrSerial,
							});
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocDate": createdDate,
							"DocDueDate": createdDate,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": innoculateItemCode,
								"WarehouseCode": sObj.WhsCode,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode,
									"U_Phase": "MP_Multiply",
									"ManufacturerSerialNumber": sObj.MnfSerial,
									"InternalSerialNumber": sObj.IntrSerial,
								}]
							}]
						};
						invTraDesDataEntry.push(payLoadInventory);
					}
				} else {
					payLoadInventory = {
						"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
						"DocDate": createdDate,
						"DocDueDate": createdDate,
						"DocumentLines": [{
							"LineNum": 0,
							"ItemCode": innoculateItemCode,
							"WarehouseCode": sObj.WhsCode,
							"Quantity": 1,
							"BatchNumbers": [{
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode,
								"U_Phase": "MP_Multiply",
								"ManufacturerSerialNumber": sObj.MnfSerial,
								"InternalSerialNumber": sObj.IntrSerial,
							}]
						}]
					};
					invTraDesDataEntry.push(payLoadInventory);
				}
			});
			$.grep(invTraDesDataEntry, function (invTransObjEntry) {
				batchUrl.push({
					url: "/b1s/v2/InventoryGenEntries",
					data: invTransObjEntry,
					method: "POST"
				});
			});

			//inventory exit to selected Item
			var invTraDesData = [];
			$.each(sItems, function (i, e) {
				sObj = table.getContextByIndex(e).getObject();
				if (invTraDesData.length > 0) {
					if (sObj.ItemCode === invTraDesData[invTraDesData.length - 1].DocumentLines[0].ItemCode) {
						invTraDesData[invTraDesData.length - 1].DocumentLines.push({
							"LineNum": invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length -
								1].LineNum + 1,
							"ItemCode": sObj.ItemCode,
							"Quantity": 1,
							"WarehouseCode": sObj.WhsCode,
							"BatchNumbers": []
						});
						invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length - 1].BatchNumbers
							.push({
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode
							});
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": sObj.ItemCode,
								"WarehouseCode": sObj.WhsCode,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode
								}]
							}]
						};
						invTraDesData.push(payLoadInventory);
					}
				} else {
					payLoadInventory = {
						"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
						"DocumentLines": [{
							"LineNum": 0,
							"ItemCode": sObj.ItemCode,
							"WarehouseCode": sObj.WhsCode,
							"Quantity": 1,
							"BatchNumbers": [{
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode
							}]
						}]
					};
					invTraDesData.push(payLoadInventory);
				}
			});

			$.grep(invTraDesData, function (invTransObj) {
				batchUrl.push({
					url: "/b1s/v2/InventoryGenExits",
					data: invTransObj,
					method: "POST"
				});
			});
			//return;
			jsonModel.setProperty("/errorTxt", []);
			this.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Selected plants are moved to Callus");
				}
				that.callusGrowthPhaseDialog.close();
				that.callusGrowthPhaseDialog.setBusy(false);
				that.clearData();
				that.loadStrainData();
				that.byId("microPropagationTable").setSelectedIndex(-1);
			}, this.callusGrowthPhaseDialog);
		},

		//method for Diff Callus
		onRecordDiffCallus: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sItems, that = this;
			var updateObject;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				updateObject = table.getContextByIndex(sItems[0]).getObject();
				if (updateObject.ItemName.search("Callus") !== -1) {
					if (!this.diffCallusGrowthPhaseDialog) {
						this.diffCallusGrowthPhaseDialog = sap.ui.xmlfragment("diffCallusGrowthPhaseDialog",
							"com.9b.MicroPropagation.view.fragments.DiffCallusGrowthPhase", this);
						this.getView().addDependent(this.diffCallusGrowthPhaseDialog);
					}
					sap.ui.core.Fragment.byId("diffCallusGrowthPhaseDialog", "avalQty").setValue(sItems.length);
					//sap.ui.core.Fragment.byId("diffCallusGrowthPhaseDialog", "location").setSelectedKey("");
					sap.ui.core.Fragment.byId("diffCallusGrowthPhaseDialog", "mDate").setDateValue(new Date());
					this.diffCallusGrowthPhaseDialog.open();
					this.loadDiffCallusItems(updateObject);
				} else {
					sap.m.MessageToast.show("You can not change the growth phase of this plant");
					return;
				}
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		loadDiffCallusItems: function (updateObject) {
			var cannabisItemArray = [];
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var filters4 = "?$filter=U_NLFID eq " + "'" + jsonModel.getProperty("/selectedLicense") + "' and ItemsGroupCode eq 109";
			var fields4 = "&$select=" + ["ItemName", "ItemsGroupCode", "ItemCode", "U_NLFID"].join();
			this.readServiecLayer("/b1s/v2/Items" + filters4 + fields4, function (data) {
				jsonModel.setProperty("/DiffCalluseItemsList", data.value);
				var strainName = updateObject.ItemName.split(" - ")[0];
				$.each(data.value, function (i, e2) {
					if (e2.ItemName === strainName + " - " + "Diff Callus") {
						cannabisItemArray.push(e2);
					}
				});
				if (cannabisItemArray.length > 0) {
					var cannabisItemCode = cannabisItemArray[0].ItemCode;
				}
				sap.ui.core.Fragment.byId("diffCallusGrowthPhaseDialog", "Item").setSelectedKey(cannabisItemCode);
			});
		},
		DiffCalluseClose: function () {
			this.diffCallusGrowthPhaseDialog.close();
		},
		DiffCallusGrowthPhase: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var table = this.getView().byId("microPropagationTable");
			var vRoom = sap.ui.core.Fragment.byId("diffCallusGrowthPhaseDialog", "growthPhase").getSelectedKey();
			//var locationID = sap.ui.core.Fragment.byId("diffCallusGrowthPhaseDialog", "location").getSelectedKey();
			var createDate = sap.ui.core.Fragment.byId("diffCallusGrowthPhaseDialog", "mDate").getDateValue();
			var dateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var createdDate = dateFormat.format(createDate);
			// if (locationID === "") {
			// 	sap.m.MessageToast.show("Please select Location");
			// 	return;
			// }
			var that = this;
			var sItems = table.getSelectedIndices();

			//inventory entry to seedling item
			var DiffCalluseItemsList = jsonModel.getProperty("/DiffCalluseItemsList");
			var innoculateItemArray = [],
				invTraDesDataEntry = [],
				batchUrl = [];
			var sObj, payLoadInventory, innoculateItemCode;

			//inventory entry to Item
			$.each(sItems, function (i, e) {
				sObj = table.getContextByIndex(e).getObject();
				var itemName = sObj.ItemName;
				var strainName = itemName.split(" - ")[0];
				$.each(DiffCalluseItemsList, function (i, e2) {
					if (e2.ItemName === strainName + " - " + "Diff Callus") {
						innoculateItemArray.push(e2);
					}
				});
				if (innoculateItemArray.length > 0) {
					innoculateItemCode = innoculateItemArray[0].ItemCode;
				}
				if (invTraDesDataEntry.length > 0) {
					if (sObj.ItemCode === invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[0].ItemCode) {
						invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines.push({
							"LineNum": invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length -
									1].DocumentLines.length -
								1].LineNum + 1,
							"ItemCode": innoculateItemCode,
							"Quantity": 1,
							"WarehouseCode": sObj.WhsCode,
							"BatchNumbers": []
						});
						invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines
								.length - 1].BatchNumbers
							.push({
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode,
								"U_Phase": "MP_Multiply",
								"ManufacturerSerialNumber": sObj.MnfSerial,
								"InternalSerialNumber": sObj.IntrSerial,
							});
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocDate": createdDate,
							"DocDueDate": createdDate,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": innoculateItemCode,
								"WarehouseCode": sObj.WhsCode,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode,
									"U_Phase": "MP_Multiply",
									"ManufacturerSerialNumber": sObj.MnfSerial,
									"InternalSerialNumber": sObj.IntrSerial,
								}]
							}]
						};
						invTraDesDataEntry.push(payLoadInventory);
					}
				} else {
					payLoadInventory = {
						"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
						"DocDate": createdDate,
						"DocDueDate": createdDate,
						"DocumentLines": [{
							"LineNum": 0,
							"ItemCode": innoculateItemCode,
							"WarehouseCode": sObj.WhsCode,
							"Quantity": 1,
							"BatchNumbers": [{
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode,
								"U_Phase": "MP_Multiply",
								"ManufacturerSerialNumber": sObj.MnfSerial,
								"InternalSerialNumber": sObj.IntrSerial,
							}]
						}]
					};
					invTraDesDataEntry.push(payLoadInventory);
				}
			});
			$.grep(invTraDesDataEntry, function (invTransObjEntry) {
				batchUrl.push({
					url: "/b1s/v2/InventoryGenEntries",
					data: invTransObjEntry,
					method: "POST"
				});
			});

			//inventory exit to selected Item
			var invTraDesData = [];
			$.each(sItems, function (i, e) {
				sObj = table.getContextByIndex(e).getObject();
				if (invTraDesData.length > 0) {
					if (sObj.ItemCode === invTraDesData[invTraDesData.length - 1].DocumentLines[0].ItemCode) {
						invTraDesData[invTraDesData.length - 1].DocumentLines.push({
							"LineNum": invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length -
								1].LineNum + 1,
							"ItemCode": sObj.ItemCode,
							"Quantity": 1,
							"WarehouseCode": sObj.WhsCode,
							"BatchNumbers": []
						});
						invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length - 1].BatchNumbers
							.push({
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode
							});
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": sObj.ItemCode,
								"WarehouseCode": sObj.WhsCode,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode
								}]
							}]
						};
						invTraDesData.push(payLoadInventory);
					}
				} else {
					payLoadInventory = {
						"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
						"DocumentLines": [{
							"LineNum": 0,
							"ItemCode": sObj.ItemCode,
							"WarehouseCode": sObj.WhsCode,
							"Quantity": 1,
							"BatchNumbers": [{
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode
							}]
						}]
					};
					invTraDesData.push(payLoadInventory);
				}
			});

			$.grep(invTraDesData, function (invTransObj) {
				batchUrl.push({
					url: "/b1s/v2/InventoryGenExits",
					data: invTransObj,
					method: "POST"
				});
			});
			//return;
			jsonModel.setProperty("/errorTxt", []);
			this.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Selected plants are moved to Diff Callus");
				}
				that.diffCallusGrowthPhaseDialog.close();
				that.diffCallusGrowthPhaseDialog.setBusy(false);
				that.clearData();
				that.loadStrainData();
				that.byId("microPropagationTable").setSelectedIndex(-1);
			}, this.diffCallusGrowthPhaseDialog);
		},

		//method for mark as clone
		markAsClones: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sItems, that = this;
			var updateObject;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				updateObject = table.getContextByIndex(sItems[0]).getObject();
				if (updateObject.ItemName.search("Diff Callus") !== -1) {
					if (!this.createCloneDialog) {
						this.createCloneDialog = sap.ui.xmlfragment("createCloneDialog",
							"com.9b.MicroPropagation.view.fragments.CreateClone", this);
						this.getView().addDependent(this.createCloneDialog);
					}
					sap.ui.core.Fragment.byId("createCloneDialog", "avalQty").setValue(sItems.length);
					//sap.ui.core.Fragment.byId("createCloneDialog", "location").setSelectedKey("");
					sap.ui.core.Fragment.byId("createCloneDialog", "mDate").setDateValue(new Date());
					this.createCloneDialog.open();
					this.loadCloneItems(updateObject);
				} else {
					sap.m.MessageToast.show("You can not change the growth phase of this plant");
					return;
				}
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		loadCloneItems: function (updateObject) {
			var cannabisItemArray = [];
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var filters4 = "?$filter=U_NLFID eq " + "'" + jsonModel.getProperty("/selectedLicense") + "' and ItemsGroupCode eq 109";
			var fields4 = "&$select=" + ["ItemName", "ItemsGroupCode", "ItemCode", "U_NLFID"].join();
			this.readServiecLayer("/b1s/v2/Items" + filters4 + fields4, function (data) {
				jsonModel.setProperty("/CloneItemsList", data.value);
				var strainName = updateObject.ItemName.split(" - ")[0];
				$.each(data.value, function (i, e2) {
					if (e2.ItemName === strainName + " - " + "Clone") {
						cannabisItemArray.push(e2);
					}
				});
				if (cannabisItemArray.length > 0) {
					var cannabisItemCode = cannabisItemArray[0].ItemCode;
				}
				sap.ui.core.Fragment.byId("createCloneDialog", "Item").setSelectedKey(cannabisItemCode);
			});
		},
		onCloneClose: function () {
			this.createCloneDialog.close();
		},
		onCloneCreate: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var table = this.getView().byId("microPropagationTable");
			var Phase = sap.ui.core.Fragment.byId("createCloneDialog", "phase").getSelectedKey();
			//var locationID = sap.ui.core.Fragment.byId("createCloneDialog", "location").getSelectedKey();
			var createDate = sap.ui.core.Fragment.byId("createCloneDialog", "mDate").getDateValue();
			var dateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var createdDate = dateFormat.format(createDate);
			if (Phase === "") {
				sap.m.MessageToast.show("Please select Phase");
				return;
			}
			var that = this;
			var sItems = table.getSelectedIndices();

			//inventory entry to seedling item
			var CloneItemsList = jsonModel.getProperty("/CloneItemsList");
			var innoculateItemArray = [],
				invTraDesDataEntry = [],
				batchUrl = [];
			var sObj, payLoadInventory, innoculateItemCode;

			//inventory entry to Item
			$.each(sItems, function (i, e) {
				sObj = table.getContextByIndex(e).getObject();
				var itemName = sObj.ItemName;
				var strainName = itemName.split(" - ")[0];
				$.each(CloneItemsList, function (i, e2) {
					if (e2.ItemName === strainName + " - " + "Clone") {
						innoculateItemArray.push(e2);
					}
				});
				if (innoculateItemArray.length > 0) {
					innoculateItemCode = innoculateItemArray[0].ItemCode;
				}
				if (invTraDesDataEntry.length > 0) {
					if (sObj.ItemCode === invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[0].ItemCode) {
						invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines.push({
							"LineNum": invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length -
									1].DocumentLines.length -
								1].LineNum + 1,
							"ItemCode": innoculateItemCode,
							"Quantity": 1,
							"WarehouseCode": sObj.WhsCode,
							"BatchNumbers": []
						});
						invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines
								.length - 1].BatchNumbers
							.push({
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode,
								"U_Phase": Phase,
								"ManufacturerSerialNumber": sObj.MnfSerial,
								"InternalSerialNumber": sObj.IntrSerial,
							});
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocDate": createdDate,
							"DocDueDate": createdDate,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": innoculateItemCode,
								"WarehouseCode": sObj.WhsCode,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode,
									"U_Phase": Phase,
									"ManufacturerSerialNumber": sObj.MnfSerial,
									"InternalSerialNumber": sObj.IntrSerial,
								}]
							}]
						};
						invTraDesDataEntry.push(payLoadInventory);
					}
				} else {
					payLoadInventory = {
						"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
						"DocDate": createdDate,
						"DocDueDate": createdDate,
						"DocumentLines": [{
							"LineNum": 0,
							"ItemCode": innoculateItemCode,
							"WarehouseCode": sObj.WhsCode,
							"Quantity": 1,
							"BatchNumbers": [{
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode,
								"U_Phase": Phase,
								"ManufacturerSerialNumber": sObj.MnfSerial,
								"InternalSerialNumber": sObj.IntrSerial,
							}]
						}]
					};
					invTraDesDataEntry.push(payLoadInventory);
				}
			});
			$.grep(invTraDesDataEntry, function (invTransObjEntry) {
				batchUrl.push({
					url: "/b1s/v2/InventoryGenEntries",
					data: invTransObjEntry,
					method: "POST"
				});
			});

			//inventory exit to selected Item
			var invTraDesData = [];
			$.each(sItems, function (i, e) {
				sObj = table.getContextByIndex(e).getObject();
				if (invTraDesData.length > 0) {
					if (sObj.ItemCode === invTraDesData[invTraDesData.length - 1].DocumentLines[0].ItemCode) {
						invTraDesData[invTraDesData.length - 1].DocumentLines.push({
							"LineNum": invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length -
								1].LineNum + 1,
							"ItemCode": sObj.ItemCode,
							"Quantity": 1,
							"WarehouseCode": sObj.WhsCode,
							"BatchNumbers": []
						});
						invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length - 1].BatchNumbers
							.push({
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode
							});
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": sObj.ItemCode,
								"WarehouseCode": sObj.WhsCode,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode
								}]
							}]
						};
						invTraDesData.push(payLoadInventory);
					}
				} else {
					payLoadInventory = {
						"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
						"DocumentLines": [{
							"LineNum": 0,
							"ItemCode": sObj.ItemCode,
							"WarehouseCode": sObj.WhsCode,
							"Quantity": 1,
							"BatchNumbers": [{
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode
							}]
						}]
					};
					invTraDesData.push(payLoadInventory);
				}
			});

			$.grep(invTraDesData, function (invTransObj) {
				batchUrl.push({
					url: "/b1s/v2/InventoryGenExits",
					data: invTransObj,
					method: "POST"
				});
			});
			//return;
			jsonModel.setProperty("/errorTxt", []);
			this.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Clone Created Successfully");
				}
				that.createCloneDialog.close();
				that.createCloneDialog.setBusy(false);
				that.clearData();
				that.loadStrainData();
				that.byId("microPropagationTable").setSelectedIndex(-1);
			}, this.createCloneDialog);
		},
		/***methods end for sed for Multiplication tab***/

		/***method start for Storage***/
		sendToMultiplication: function () {
			var that = this;
			var jsonModel = that.getOwnerComponent().getModel("jsonModel");
			var sItems;
			var microPropagationTable = this.getView().byId("microPropagationTable");
			sItems = microPropagationTable.getSelectedIndices();
			if (sItems.length > 0) {
				sap.m.MessageBox.confirm("Are you sure you want to move these plants for Multiplication ?", {
					onClose: function (action) {
						if (action === "OK") {
							var sObj, batchUrl = [];
							$.each(sItems, function (i, e) {
								sObj = microPropagationTable.getContextByIndex(e).getObject();
								var payLoadInventoryEntry = {
									U_Phase: "MP_Multiply"
								};
								batchUrl.push({
									url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
									data: payLoadInventoryEntry,
									method: "PATCH"
								});
							});
							jsonModel.setProperty("/errorTxt", []);
							that.createBatchCall(batchUrl, function () {
								var errorTxt = jsonModel.getProperty("/errorTxt");
								if (errorTxt.length > 0) {
									sap.m.MessageBox.error(errorTxt.join("\n"));
								} else {
									sap.m.MessageToast.show("Selected plants are moved for Multiplication");
								}
								that.loadStrainData();
								microPropagationTable.setSelectedIndex(-1);
							});
						}
					}
				});
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		/***method end for Storage***/

		/*method for destroy plants*/
		performDestroyPlants: function () {
			var that = this;
			var sItems;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				//check single batch is selected or not
				var batchIDArray = [];
				$.each(sItems, function (i, e) {
					var sObj = table.getContextByIndex(e).getObject();
					batchIDArray.push(sObj.IntrSerial);
				});
				var allSame = new Set(batchIDArray).size === 1;
				if (allSame == false) {
					sap.m.MessageToast.show("Please select same batch ID");
					return;
				}

				if (!this.confirmDestroyDialog) {
					this.confirmDestroyDialog = sap.ui.xmlfragment("ConfirmDestroyPlant", "com.9b.MicroPropagation.view.fragments.DestroyPlant",
						this);
					this.getView().addDependent(this.confirmDestroyDialog);
				}
				this.getView().getModel("jsonModel").setProperty("/oDesctroyPlants", {});
				this.confirmDestroyDialog.bindElement("jsonModel>/oDesctroyPlants");
				sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wRecDate").setDateValue(new Date());
				that.onLoadWasteReasonMethod();
				this.confirmDestroyDialog.open();
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
				return;
			}
		},
		onWtChange: function (evt) {
			var value = evt.getParameter("newValue");
			value = value.replace(/[^.\d]/g, '').replace(/^(\d*\.?)|(\d*)\.?/g, "$1$2");
			evt.getSource().setValue(value);
		},
		onLoadWasteReasonMethod: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			this.readServiecLayer("/b1s/v2/U_NWMET", function (e) {
				jsonModel.setProperty("/WasteMethodsList", e.value);
			});
			this.readServiecLayer("/b1s/v2/U_NWREA", function (e) {
				jsonModel.setProperty("/WasteReasonsList", e.value);
			});
		},
		onDestroyClose: function () {
			this.confirmDestroyDialog.close();
		},
		onDestroyPlant: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sItems;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
			var that = this;
			var wMethod = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wMethod").getSelectedKey();
			var matUsed = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "matUsed").getValue();
			var uom = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "uom").getSelectedKey();
			var reason = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "reason").getSelectedKey();
			var notes = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "notes").getValue();
			var wRecDate = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wRecDate").getValue();
			var wasteWt = Number(sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wasteWt").getValue());
			var plantCount = sItems.length;
			var weightPerPlant = Number(wasteWt) / plantCount;
			if (wMethod === "") {
				sap.m.MessageToast.show("Please select waste method");
				return;
			} else if (matUsed === "") {
				sap.m.MessageToast.show("Please enter material used");
				return;
			} else if (wasteWt === "" || wasteWt === 0) {
				sap.m.MessageToast.show("Please enter waste weight");
				return;
			} else if (isNaN(wasteWt)) {
				sap.m.MessageToast.show("Please enter numeric value only");
				return;
			} else if (uom === "") {
				sap.m.MessageToast.show("Please select waste UOM");
				return;
			} else if (reason === "") {
				sap.m.MessageToast.show("Please select reason");
				return;
			} else if (notes === "") {
				sap.m.MessageToast.show("Please add notes");
				return;
			} else if (wRecDate === "") {
				sap.m.MessageToast.show("Please select Date");
				return;
			}
			var createDate = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wRecDate").getDateValue();
			var cDate = this.convertUTCDateTime(createDate);
			var invTraDesData = [],
				metricPayload = [],
				sObj,
				cDate = this.convertUTCDateTime(createDate),
				payLoadInventory,
				batchUrl = [],
				payLoadUpdate, payLoadDestroyCreate;
			if (sItems.length > 0) {
				$.each(sItems, function (i, e) {
					sObj = table.getContextByIndex(e).getObject();
					var itemName = sObj.ItemName;
					var strainName = itemName.split(" - ")[0];
					payLoadDestroyCreate = {
						U_NPLID: sObj.BatchNum,
						U_NWTMT: wMethod,
						U_NMTUS: matUsed,
						//U_NWTWT: wasteWt.toFixed(2),
						U_NWTWT: weightPerPlant.toFixed(2),
						U_NWTUM: uom,
						U_NDTRS: reason,
						U_NNOTE: notes,
						U_NPQTY: 1,
						U_NCRDT: cDate,
						U_NPBID: sObj.IntrSerial,
						U_NSTNM: strainName,
						U_NLCNM: sObj.WhsCode + " - " + sObj.WhsName, //location
						U_NCLPL: "Plant", // clone or plant
						U_NPHSE: "Pheno", //phase
						U_NLFID: jsonModel.getProperty("/selectedLicense")
					};
					batchUrl.push({
						url: "/b1s/v2/NDRPL",
						data: payLoadDestroyCreate,
						method: "POST"
					});
					if (invTraDesData.length > 0) {
						if (sObj.ItemCode === invTraDesData[invTraDesData.length - 1].DocumentLines[0].ItemCode) {
							invTraDesData[invTraDesData.length - 1].DocumentLines.push({
								"LineNum": invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length -
									1].LineNum + 1,
								"ItemCode": sObj.ItemCode,
								"Quantity": 1,
								"WarehouseCode": sObj.WhsCode,
								"BatchNumbers": []
							});
							invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length - 1].BatchNumbers
								.push({
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode
								});
						} else {
							payLoadInventory = {
								"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
								"DocumentLines": [{
									"LineNum": 0,
									"ItemCode": sObj.ItemCode,
									"WarehouseCode": sObj.WhsCode,
									"Quantity": 1,
									"BatchNumbers": [{
										"BatchNumber": sObj.BatchNum,
										"Quantity": 1,
										"Location": sObj.WhsCode
									}]
								}]
							};
							invTraDesData.push(payLoadInventory);
						}
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": sObj.ItemCode,
								"WarehouseCode": sObj.WhsCode,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode
								}]
							}]
						};
						invTraDesData.push(payLoadInventory);
					}
				});
				$.grep(invTraDesData, function (invTransObj) {
					batchUrl.push({
						url: "/b1s/v2/InventoryGenExits",
						data: invTransObj,
						method: "POST"
					});
				});

				var selObject = table.getContextByIndex(sItems[0]).getObject();
				var payLoadWasteCreate = {
					U_NPBID: selObject.IntrSerial,
					U_NWTMT: wMethod,
					U_NMTUS: matUsed,
					U_NWTWT: wasteWt.toFixed(2),
					U_NWTUM: uom,
					U_NWTRS: reason,
					U_NNOTE: notes,
					U_NCRDT: cDate,
					U_NLUDT: that.convertUTCDateTime(new Date()),
					U_NLCNM: selObject.WhsCode + " - " + selObject.WhsName,
					U_NLFID: jsonModel.getProperty("/selectedLicense"), //license name
					U_NPQTY: sItems.length
				};
				batchUrl.push({
					url: "/b1s/v2/NWTHS",
					data: payLoadWasteCreate,
					method: "POST"
				});

				jsonModel.setProperty("/errorTxt", []);
				this.createBatchCall(batchUrl, function () {
					var errorTxt = jsonModel.getProperty("/errorTxt");
					if (errorTxt.length > 0) {
						sap.m.MessageBox.error(errorTxt.join("\n"));
					} else {
						sap.m.MessageToast.show("Plant Status Changed Successfully");
					}
					sap.m.MessageToast.show("Plant Status Changed Successfully");
					that.byId("microPropagationTable").setSelectedIndex(-1);
					that.confirmDestroyDialog.close();
					that.loadStrainData();
				}, this.confirmDestroyDialog);
			} else {
				sap.m.MessageToast.show("Please select atleast one record");
			}
		},

		clearAllFilters: function () {
			var filterTable = this.getView().byId("microPropagationTable");
			var aColumns = filterTable.getColumns();
			for (var i = 0; i <= aColumns.length; i++) {
				filterTable.filter(aColumns[i], null);
				filterTable.sort(aColumns[i], null);
			}
			this.byId("searchFieldTable").removeAllTokens();
			this.byId("searchFieldTable1").removeAllTokens();
			this.byId("searchFieldTable2").removeAllTokens();
		},
		onFilterTable: function (evt) {
			var customData = evt.getParameter("column").getLabel().getCustomData();
			if (customData.length > 0 && customData[0].getKey() === "DAYS") {
				var sValue = evt.getParameter("value");
				var filters = [new sap.ui.model.Filter("Quantity", "EQ", sValue)];
				this.byId("microPropagationTable").getBinding("rows").filter(filters);
			}
		},
		fillFilterLoad: function (elementC, removedText) {
			var orFilter = [];
			var andFilter = [];
			$.each(elementC.getTokens(), function (i, info) {
				var value = info.getText();
				if (value !== removedText) {
					orFilter.push(new sap.ui.model.Filter("BatchNum", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_NSTNM", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("ItemName", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("MnfSerial", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("WhsName", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("WhsCode", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("IntrSerial", "Contains", value.toLowerCase()));
					andFilter.push(new sap.ui.model.Filter({
						filters: orFilter,
						and: false,
						caseSensitive: false
					}));
				}
			});
			this.byId("microPropagationTable").getBinding("rows").filter(andFilter);
		},
		clearData: function () {
			this.byId("microPropagationTable").clearSelection();
		},
		onPlantsRefresh: function () {
			this.clearAllFilters();
			this.byId("searchFieldTable").removeAllTokens();
			this.byId("searchFieldTable1").removeAllTokens();
			this.byId("searchFieldTable2").removeAllTokens();
			this.loadStrainData();
		},
		handleRowSelection: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
			var sItems;
			if (sItems.length === 1) {
				jsonModel.setProperty("/isSingleSelect", true);
			} else {
				jsonModel.setProperty("/isSingleSelect", false);
			}
		}

	});
});