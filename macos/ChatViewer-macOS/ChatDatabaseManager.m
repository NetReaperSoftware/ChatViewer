#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ChatDatabaseManager, NSObject)

// Database management methods
RCT_EXTERN_METHOD(openDatabase:(NSString *)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(closeDatabase)

// Generic query execution
RCT_EXTERN_METHOD(executeQuery:(NSString *)sql
                  params:(NSArray *)params
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Messages-specific query methods
RCT_EXTERN_METHOD(getChats:(NSInteger)limit
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(searchMessages:(NSString *)searchTerm
                  limit:(NSInteger)limit
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getMessagesForChat:(NSInteger)chatId
                  limit:(NSInteger)limit
                  offset:(NSInteger)offset
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end