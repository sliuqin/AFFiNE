//
//  SystemMessageCellViewModel.swift
//  Intelligents
//
//  Created by 秋星桥 on 6/27/25.
//

import Foundation

struct SystemMessageCellViewModel: ChatCellViewModel {
  var cellType: CellType = .systemMessage
  var id: UUID
  var content: String
  var timestamp: Date?
}
